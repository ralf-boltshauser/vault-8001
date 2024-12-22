import { Action, CrewMember, PerkType } from "../types/game.types";

export interface BaseCombatantResult {
  eliminated: boolean;
  died: boolean;
  jailed: boolean;
  jailTerm: number;
}

export interface CrewCombatantResult extends BaseCombatantResult {
  type: "crew";
  combatant: CrewMember;
}

export interface GuardCombatantResult extends BaseCombatantResult {
  type: "guard";
  combatant: null;
}

export type CombatantResult = CrewCombatantResult | GuardCombatantResult;

export interface CombatResult {
  winner: CrewMember | null;
  loser: CombatantResult;
}

export interface TeamCombatResult {
  winners: CrewMember[];
  casualties: CombatantResult[];
  remainingDefenders: number;
}

export class CombatService {
  private calculateWinProbability(
    attacker: CrewMember,
    defender: CrewMember | null
  ): number {
    let baseChance = 0.5; // Base 50/50 chance for equal opponents

    if (!defender) {
      // Fighting against a guard
      baseChance = 0.5;

      // Gun perk gives advantage against guards
      if (attacker.perks.some((p) => p.type === PerkType.Gun)) {
        baseChance = 0.7; // 70% chance with gun
      }
    } else {
      // Crew vs Crew combat
      const attackerHasGun = attacker.perks.some(
        (p) => p.type === PerkType.Gun
      );
      const defenderHasGun = defender.perks.some(
        (p) => p.type === PerkType.Gun
      );

      if (attackerHasGun && !defenderHasGun) {
        baseChance = 0.7; // Attacker has advantage
      } else if (!attackerHasGun && defenderHasGun) {
        baseChance = 0.3; // Defender has advantage
      }
      // If both have guns or neither has guns, stays at 50%
    }

    return baseChance;
  }

  private processCasualty(
    loser: CrewMember,
    isGuardFight: boolean = true
  ): CrewCombatantResult {
    // In crew vs crew combat, losers always die
    const died = !isGuardFight || Math.random() < 0.3; // Always die in crew vs crew, 30% chance vs guards
    const jailed = isGuardFight && !died; // Can only be jailed in guard fights
    const hasGunPerk = loser.perks.some((p) => p.type === PerkType.Gun);
    const jailTerm = jailed ? (hasGunPerk ? 5 : 3) : 0; // Jail terms only matter if jailed

    // Clear actions if jailed
    if (jailed) {
      loser.action = Action.None;
      loser.plannedAction = undefined;
    }

    return {
      type: "crew",
      combatant: loser,
      eliminated: true,
      died,
      jailed,
      jailTerm,
    };
  }

  public fight1v1(
    attacker: CrewMember,
    defender: CrewMember | null
  ): CombatResult {
    const isGuardFight = defender === null;
    const winProbability = this.calculateWinProbability(attacker, defender);
    const attackerWins = Math.random() < winProbability;

    if (attackerWins) {
      return {
        winner: attacker,
        loser: defender
          ? this.processCasualty(defender, false) // Crew vs Crew
          : {
              type: "guard",
              combatant: null,
              eliminated: true,
              died: true,
              jailed: false,
              jailTerm: 0,
            },
      };
    } else {
      return {
        winner: defender,
        loser: this.processCasualty(attacker, isGuardFight),
      };
    }
  }

  public teamCombat(
    attackers: CrewMember[],
    defendersOrCount: number | CrewMember[],
    isGuards: boolean = true
  ): TeamCombatResult {
    console.log(
      `\n🥊 Starting ${isGuards ? "Crew vs Guards" : "Crew vs Crew"} combat:`
    );
    console.log(`  Attackers: ${attackers.map((a) => a.name).join(", ")}`);

    const numDefenders =
      typeof defendersOrCount === "number"
        ? defendersOrCount
        : defendersOrCount.length;
    const defenders =
      typeof defendersOrCount === "number" ? null : defendersOrCount;

    console.log(
      `  Defenders: ${
        isGuards
          ? `${numDefenders} guards`
          : defenders
          ? defenders.map((d) => d.name).join(", ")
          : numDefenders + " crew members"
      }`
    );

    const survivors: CrewMember[] = [];
    const casualties: CombatantResult[] = [];
    let remainingDefenders = numDefenders;
    let currentAttackers = [...attackers];
    let currentDefenders = defenders ? [...defenders] : null;
    let currentAttackerIndex = 0;

    // Keep going until we run out of attackers or defenders
    while (currentAttackers.length > 0 && remainingDefenders > 0) {
      const currentAttacker = currentAttackers[currentAttackerIndex];
      console.log(`\n  🎯 ${currentAttacker.name}'s turn:`);

      // Same logic for both guards and crew combat
      let keepFighting = true;
      while (keepFighting && remainingDefenders > 0) {
        if (isGuards) {
          console.log(
            `    ${currentAttacker.name} fights another guard (${remainingDefenders} remaining)`
          );
          const result = this.fight1v1(currentAttacker, null);

          if (result.winner === currentAttacker) {
            // Attacker won against a guard
            console.log(`    ✅ ${currentAttacker.name} defeated a guard!`);
            remainingDefenders--;
            // Attacker continues to next guard if any remain
            keepFighting = remainingDefenders > 0;
          } else {
            // Attacker lost
            console.log(`    ❌ ${currentAttacker.name} was defeated`);
            casualties.push(result.loser);
            keepFighting = false;
            // Remove the defeated attacker
            currentAttackers = currentAttackers.filter(
              (a) => a !== currentAttacker
            );
          }
        } else {
          // For crew vs crew, get next defender
          const defender = currentDefenders![0];
          if (!defender) break;

          console.log(`    ${currentAttacker.name} fights ${defender.name}`);
          const result = this.fight1v1(currentAttacker, defender);

          if (result.winner === currentAttacker) {
            // Attacker won
            console.log(
              `    ✅ ${currentAttacker.name} defeated ${defender.name}!`
            );
            casualties.push(result.loser);
            // Remove the defeated defender
            currentDefenders = currentDefenders!.filter((d) => d !== defender);
            remainingDefenders--;
            // Attacker continues to next defender if any remain
            keepFighting = remainingDefenders > 0;
          } else {
            // Attacker lost
            console.log(
              `    ❌ ${currentAttacker.name} was defeated by ${defender.name}`
            );
            casualties.push(result.loser);
            keepFighting = false;
            // Remove the defeated attacker
            currentAttackers = currentAttackers.filter(
              (a) => a !== currentAttacker
            );
          }
        }
      }

      // If attacker survived all their fights, add them to survivors
      if (keepFighting || remainingDefenders === 0) {
        survivors.push(currentAttacker);
      }

      // Move to next attacker if current one was defeated
      if (!keepFighting) {
        currentAttackerIndex++;
        // Reset index if we've reached the end
        if (currentAttackerIndex >= currentAttackers.length) {
          currentAttackerIndex = 0;
        }
      }
    }

    // Add any remaining defenders to survivors in crew vs crew combat
    if (!isGuards && currentDefenders && currentDefenders.length > 0) {
      survivors.push(...currentDefenders);
    }

    // For guard fights, add any remaining attackers who didn't need to fight
    if (isGuards && remainingDefenders === 0) {
      currentAttackers.forEach((attacker) => {
        if (!survivors.includes(attacker)) {
          console.log(`    ✨ ${attacker.name} survived without fighting`);
          survivors.push(attacker);
        }
      });
    }

    console.log("\n  📊 Combat Results:");
    console.log(
      `    Survivors: ${survivors.map((s) => s.name).join(", ") || "none"}`
    );
    console.log(
      `    Casualties: ${
        casualties
          .filter((c) => c.type === "crew")
          .map((c) => c.combatant.name)
          .join(", ") || "none"
      }`
    );
    console.log(`    Remaining defenders: ${remainingDefenders}`);

    return {
      winners: survivors,
      casualties,
      remainingDefenders,
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    // Fisher-Yates shuffle algorithm
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  public multiCrewCombat(
    coopCrews: CrewMember[][],
    hostileCrews: CrewMember[][],
    numGuards: number
  ): TeamCombatResult {
    console.log("\n🏦 Starting Bank Heist:");
    console.log(`  Guards: ${numGuards}`);
    console.log(`  Cooperative crews: ${coopCrews.length}`);
    console.log(`  Hostile crews: ${hostileCrews.length}`);

    // First, combine all coop crews into one team and shuffle them
    const combinedCoopCrew = this.shuffleArray(coopCrews.flat());
    console.log(
      `\n👥 Combined cooperative crew (randomly ordered): ${combinedCoopCrew
        .map((m) => m.name)
        .join(", ")}`
    );

    // Fight against guards first
    console.log("\n🏛️ Phase 1: Heist Crew vs Bank Guards");
    const guardCombatResult = this.teamCombat(
      combinedCoopCrew,
      numGuards,
      true
    );

    // If coop crews failed against guards, return early
    if (guardCombatResult.remainingDefenders > 0) {
      console.log("\n❌ Heist failed - Guards prevailed");
      return guardCombatResult;
    }

    console.log("\n✅ Heist successful!");

    // If there are hostile crews and coop crews won against guards
    if (hostileCrews.length > 0) {
      console.log("\n🔥 Phase 2: Hostile Crews Tournament");
      // First, hostile crews fight each other in a tournament style
      let hostileWinners = [...hostileCrews];
      let hostileCasualties: CombatantResult[] = [];
      let round = 1;

      // Keep fighting until only one hostile crew remains
      while (hostileWinners.length > 1) {
        console.log(`\n  Round ${round}:`);
        const nextRoundWinners: CrewMember[][] = [];

        // Pair up crews and fight
        for (let i = 0; i < hostileWinners.length; i += 2) {
          if (i + 1 >= hostileWinners.length) {
            // Odd number of crews, this one gets a bye to next round
            console.log(`  🎟️ Crew ${i + 1} gets a bye to next round`);
            continue;
          }

          console.log(`  Match: Crew ${i + 1} vs Crew ${i + 2}`);
          // Fight between two hostile crews
          const fightResult = this.teamCombat(
            hostileWinners[i],
            hostileWinners[i + 1],
            false
          );

          // Add winners to next round
          if (fightResult.winners.length > 0) {
            nextRoundWinners.push(fightResult.winners);
            console.log(`    Winner: Crew ${i + 1}`);
          } else {
            console.log(`    No survivors from this match!`);
          }

          // Collect casualties
          hostileCasualties = [...hostileCasualties, ...fightResult.casualties];
        }

        hostileWinners = nextRoundWinners;
        round++;
      }

      // If any hostile crews survived their tournament
      if (hostileWinners.length > 0 && hostileWinners[0].length > 0) {
        console.log(
          "\n⚔️ Phase 3: Final Showdown - Tournament Winner vs Heist Crew"
        );
        console.log(
          `  Tournament Winners: ${hostileWinners[0]
            .map((w) => w.name)
            .join(", ")}`
        );
        console.log(
          `  Heist Survivors: ${guardCombatResult.winners
            .map((w) => w.name)
            .join(", ")}`
        );

        // Final fight: Surviving hostile crew vs successful heist crew
        // Now we pass the actual crew members to fight against each other
        const finalFight = this.teamCombat(
          hostileWinners[0], // Tournament winners
          guardCombatResult.winners, // Actual heist survivors
          false // Not guards, actual crew members will fight
        );

        console.log("\n🏆 Final Results:");
        console.log(
          `  Winners: ${finalFight.winners.map((w) => w.name).join(", ")}`
        );
        console.log(
          `  Total Casualties: ${[
            ...guardCombatResult.casualties,
            ...hostileCasualties,
            ...finalFight.casualties,
          ]
            .filter((c) => c.type === "crew")
            .map((c) => c.combatant.name)
            .join(", ")}`
        );

        return {
          winners: finalFight.winners,
          casualties: [
            ...guardCombatResult.casualties,
            ...hostileCasualties,
            ...finalFight.casualties,
          ],
          remainingDefenders: 0,
        };
      }

      console.log("\n💀 No hostile crews survived the tournament");
      // If no hostile crews survived their tournament
      return {
        winners: guardCombatResult.winners,
        casualties: [...guardCombatResult.casualties, ...hostileCasualties],
        remainingDefenders: 0,
      };
    }

    // If no hostile crews, return guard combat result with its casualties
    return guardCombatResult;
  }
}
