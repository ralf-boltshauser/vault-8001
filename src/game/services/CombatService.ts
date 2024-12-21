import { CrewMember, PerkType } from "../types/game.types";

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

  private processCasualty(loser: CrewMember): CrewCombatantResult {
    const died = Math.random() < 0.3; // 30% chance of dying
    const jailed = !died; // If they didn't die, they're jailed
    const hasGunPerk = loser.perks.some((p) => p.type === PerkType.Gun);
    const jailTerm = hasGunPerk ? 5 : 3; // 5 days with gun, 3 days without

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
    const winProbability = this.calculateWinProbability(attacker, defender);
    const attackerWins = Math.random() < winProbability;

    if (attackerWins) {
      return {
        winner: attacker,
        loser: defender
          ? this.processCasualty(defender)
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
        loser: this.processCasualty(attacker),
      };
    }
  }

  public teamCombat(
    attackers: CrewMember[],
    numDefenders: number,
    isGuards: boolean = true
  ): TeamCombatResult {
    console.log(
      `\n🥊 Starting ${isGuards ? "Crew vs Guards" : "Crew vs Crew"} combat:`
    );
    console.log(`  Attackers: ${attackers.map((a) => a.name).join(", ")}`);
    console.log(
      `  Defenders: ${
        isGuards ? `${numDefenders} guards` : `${numDefenders} crew members`
      }`
    );

    const survivors: CrewMember[] = [];
    const casualties: CombatantResult[] = [];
    let remainingDefenders = numDefenders;
    let currentAttackers = [...attackers];
    let currentAttackerIndex = 0;

    // Keep going until we run out of attackers or defenders
    while (currentAttackers.length > 0 && remainingDefenders > 0) {
      const currentAttacker = currentAttackers[currentAttackerIndex];
      console.log(`\n  🎯 ${currentAttacker.name}'s turn:`);

      if (isGuards) {
        // For guards, the same attacker keeps fighting until they die or all guards are dead
        let keepFighting = true;
        while (keepFighting && remainingDefenders > 0) {
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
        }

        // If attacker survived all their fights, add them to survivors
        if (keepFighting || remainingDefenders === 0) {
          survivors.push(currentAttacker);
        }
      } else {
        // For crew vs crew, it's still one fight per pair
        const defender = currentAttackers[currentAttackerIndex + 1];
        if (!defender) break; // No defender to fight against

        const result = this.fight1v1(currentAttacker, defender);

        if (result.winner === currentAttacker) {
          // Attacker won
          console.log(
            `    ✅ ${currentAttacker.name} won against ${defender.name}!`
          );
          survivors.push(currentAttacker);
          casualties.push(result.loser);
          // Remove the defeated defender
          currentAttackers = currentAttackers.filter((a) => a !== defender);
        } else {
          // Attacker lost
          console.log(
            `    ❌ ${currentAttacker.name} was defeated by ${defender.name}`
          );
          casualties.push(result.loser);
          // Remove the defeated attacker
          currentAttackers = currentAttackers.filter(
            (a) => a !== currentAttacker
          );
          survivors.push(defender);
        }
      }

      // Move to next attacker if in crew vs crew mode
      if (!isGuards) {
        currentAttackerIndex++;
        // Reset index if we've reached the end
        if (currentAttackerIndex >= currentAttackers.length) {
          currentAttackerIndex = 0;
        }
      }
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

  public multiCrewCombat(
    coopCrews: CrewMember[][],
    hostileCrews: CrewMember[][],
    numGuards: number
  ): TeamCombatResult {
    console.log("\n🏦 Starting Bank Heist:");
    console.log(`  Guards: ${numGuards}`);
    console.log(`  Cooperative crews: ${coopCrews.length}`);
    console.log(`  Hostile crews: ${hostileCrews.length}`);

    // First, combine all coop crews into one team
    const combinedCoopCrew = coopCrews.flat();
    console.log(
      `\n👥 Combined cooperative crew: ${combinedCoopCrew
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
            nextRoundWinners.push(hostileWinners[i]);
            continue;
          }

          console.log(`  Match: Crew ${i + 1} vs Crew ${i + 2}`);
          // Fight between two hostile crews
          const fightResult = this.teamCombat(
            hostileWinners[i],
            hostileWinners[i + 1].length,
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
        const finalFight = this.teamCombat(
          hostileWinners[0],
          guardCombatResult.winners.length,
          false
        );

        console.log("\n🏆 Final Results:");
        console.log(
          `  Winners: ${finalFight.winners.map((w) => w.name).join(", ")}`
        );
        console.log(
          `  Total Casualties: ${[
            ...hostileCasualties,
            ...finalFight.casualties,
          ]
            .filter((c) => c.type === "crew")
            .map((c) => c.combatant.name)
            .join(", ")}`
        );

        return {
          winners: finalFight.winners,
          casualties: [...hostileCasualties, ...finalFight.casualties],
          remainingDefenders: finalFight.remainingDefenders,
        };
      }

      console.log("\n💀 No hostile crews survived the tournament");
      // If no hostile crews survived their tournament
      return {
        winners: guardCombatResult.winners,
        casualties: hostileCasualties,
        remainingDefenders: 0,
      };
    }

    // If no hostile crews, return guard combat result
    return guardCombatResult;
  }
}
