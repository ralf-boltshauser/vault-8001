import { WebSocket } from "ws";
import { calculateWorkSalary } from "../config/gameConfig";
import { GameState } from "../models/GameState.js";
import {
  Action,
  Attack,
  AttackingCrew,
  AttackOutcome,
  AttackType,
  Bank,
  CombatOutcome,
  CombatPhase,
  CombatResult,
  Crew,
  CrewMember,
  CrewMemberStatus,
  GamePhase,
  PERKS,
  PerkType,
  PlannedAction,
  TurnReport,
} from "../types/game.types.js";
import { calculateSuccess, generateId } from "../utils/helpers.js";

interface PlayerConnection {
  ws: WebSocket;
  crewId: string;
}

const CREW_MEMBER_COST = 50000;
const CREW_NAMES = [
  "Shadow",
  "Ghost",
  "Cipher",
  "Echo",
  "Wraith",
  "Phantom",
  "Spectre",
  "Raven",
  "Wolf",
  "Fox",
];

export class GameService {
  private static instance: GameService;
  private gameState: GameState;
  private playerConnections: Map<string, PlayerConnection> = new Map();
  private disconnectedPlayers: Set<string> = new Set();

  private constructor() {
    this.gameState = GameState.getInstance();
    this.initializeBanks();
  }

  static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  // Turn Management
  markCrewReady(crewId: string): void {
    const crew = this.gameState.getCrew(crewId);
    if (!crew) return;

    // Verify all crew members have actions assigned
    const allMembersHaveActions = crew.crewMembers.every(
      (member) => member.plannedAction || member.action !== Action.None
    );

    if (!allMembersHaveActions) {
      throw new Error("All crew members must have actions assigned");
    }

    crew.isReadyForNextPhase = true;
    this.gameState.updateCrew(crew);

    // Check if all crews are ready
    if (this.areAllCrewsReady()) {
      this.resolveActions();
    }
  }

  private areAllCrewsReady(): boolean {
    return Array.from(this.gameState.getAllCrews()).every(
      (crew) => crew.isReadyForNextPhase
    );
  }

  assignAction(crewId: string, memberId: string, action: PlannedAction): void {
    const crew = this.gameState.getCrew(crewId);
    if (!crew) return;

    const member = crew.crewMembers.find((m) => m.id === memberId);
    if (!member) return;

    member.plannedAction = action;
    this.gameState.updateCrew(crew);
  }

  private resolveActions(): void {
    this.gameState.setPhase(GamePhase.Resolution);
    this.broadcastGameState();

    const crews = this.gameState.getAllCrews();
    const bankAttacks = new Map<string, CrewMember[]>(); // bankId -> attackers

    // Clear all reports at the start of resolution
    crews.forEach((crew) => {
      crew.turnReports = [];
      this.gameState.updateCrew(crew);
    });

    // Handle basic income for crews with no healthy members
    crews.forEach((crew) => {
      const healthyMembers = crew.crewMembers.filter(
        (member) => member.status === CrewMemberStatus.Healthy
      );

      if (healthyMembers.length === 0) {
        crew.capital += 10000; // Basic income for having no healthy crew
        crew.turnReports = [
          {
            crewMemberId: "system",
            message:
              "With no healthy crew members to manage, you earned basic income from regular work.",
            details: {
              earnings: 10000,
            },
          },
        ];
        this.gameState.updateCrew(crew);
      }
    });

    // First, handle all work actions
    crews.forEach((crew) => {
      crew.crewMembers.forEach((member) => {
        if (member.plannedAction?.type === Action.Work) {
          this.resolveWorkAction(crew, member);
        } else if (
          member.plannedAction?.type === Action.Attack &&
          member.plannedAction.targetId
        ) {
          const attackers =
            bankAttacks.get(member.plannedAction.targetId) || [];
          attackers.push(member);
          bankAttacks.set(member.plannedAction.targetId, attackers);
        }
      });
    });

    // Then handle bank attacks
    bankAttacks.forEach((attackers, bankId) => {
      const bank = this.gameState.getBank(bankId);
      if (!bank) return;

      const attackGroups = this.groupAttackers(attackers);
      attackGroups.forEach((group) => {
        const attack = this.createAttack(bank, group);
        const result = this.executeAttack(attack);
        this.generateReports(result);
      });
    });

    // Reset for next turn
    this.prepareNextTurn();
  }

  private resolveWorkAction(crew: Crew, member: CrewMember): void {
    // Calculate earnings based on perks and random variance
    const earnings = calculateWorkSalary(member.perks.map((p) => p.type));

    // Update crew's capital
    crew.capital += earnings;

    // Generate work report
    const report: TurnReport = {
      crewMemberId: member.id,
      message: `I worked a regular job and earned some money.`,
      details: {
        earnings,
      },
    };

    // Replace or initialize turn reports
    crew.turnReports = crew.turnReports || [];
    const existingReportIndex = crew.turnReports.findIndex(
      (r) => r.crewMemberId === member.id
    );
    if (existingReportIndex >= 0) {
      crew.turnReports[existingReportIndex] = report;
    } else {
      crew.turnReports.push(report);
    }

    // Update crew in game state
    this.gameState.updateCrew(crew);
  }

  private groupAttackers(attackers: CrewMember[]): CrewMember[][] {
    const groups = new Map<string, CrewMember[]>();

    attackers.forEach((attacker) => {
      const collaboratorIds = attacker.plannedAction?.collaborators || [];
      const groupKey = [attacker.id, ...collaboratorIds].sort().join(",");

      if (!groups.has(groupKey)) {
        const collaborators = attackers.filter(
          (other) =>
            collaboratorIds.includes(other.id) ||
            other.plannedAction?.collaborators?.includes(attacker.id)
        );
        groups.set(groupKey, [attacker, ...collaborators]);
      }
    });

    return Array.from(groups.values());
  }

  private generateReports(attack: Attack): void {
    attack.attackingCrews.forEach((attackingCrew) => {
      const crew = this.gameState.getCrew(attackingCrew.crew.id);
      if (!crew) return;

      // Generate new reports for this turn
      const reports: TurnReport[] = attackingCrew.crewMembers.map((member) => {
        const collaborators = attackingCrew.crewMembers
          .filter((m) => m.id !== member.id)
          .map((m) => m.name);

        return {
          crewMemberId: member.id,
          message: this.generateReportMessage(attack, member, collaborators),
          details: {
            location: attack.bank.name,
            collaborators: collaborators,
            outcome: attack.outcome,
            earnings: attack.loot?.amount
              ? Math.floor(
                  attack.loot.amount / attackingCrew.crewMembers.length
                )
              : 0,
          },
        };
      });

      // Replace old reports with new ones
      crew.turnReports = reports;
      this.gameState.updateCrew(crew);
    });
  }

  private generateReportMessage(
    attack: Attack,
    member: CrewMember,
    collaborators: string[]
  ): string {
    const collaboratorText =
      collaborators.length > 0
        ? ` together with ${collaborators.join(", ")}`
        : " alone";

    const outcomeText =
      attack.outcome === AttackOutcome.Success
        ? "successfully"
        : attack.outcome === AttackOutcome.Partial
        ? "partially succeeded in"
        : "failed in";

    const lootText = attack.loot?.amount
      ? ` We secured $${Math.floor(
          attack.loot.amount / attack.attackingCrews[0].crewMembers.length
        ).toLocaleString()}.`
      : "";

    return `I attacked ${attack.bank.name}${collaboratorText} and ${outcomeText} the heist.${lootText}`;
  }

  private prepareNextTurn(): void {
    // Reset crew ready states
    this.gameState.getAllCrews().forEach((crew) => {
      crew.isReadyForNextPhase = false;

      crew.crewMembers.forEach((member) => {
        if (member.plannedAction) {
          // Keep the previous action as the default for next turn
          const previousAction = member.plannedAction;
          member.plannedAction = undefined;
          // Set up the same action for next turn
          this.assignAction(crew.id, member.id, previousAction);
        }
      });

      this.gameState.updateCrew(crew);
    });

    // Move directly to next planning phase
    this.gameState.setPhase(GamePhase.Planning);
    this.gameState.setTurnNumber(this.gameState.getTurnNumber() + 1);
    this.broadcastGameState();
  }

  private generateRandomName(): string {
    const randomName =
      CREW_NAMES[Math.floor(Math.random() * CREW_NAMES.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    return `${randomName}-${randomNumber}`;
  }

  private generateRandomPerks(): (typeof PERKS)[PerkType][] {
    const numPerks = Math.random() < 0.3 ? 2 : Math.random() < 0.7 ? 1 : 0; // 30% chance for 2 perks, 40% for 1 perk, 30% for no perks
    if (numPerks === 0) return [];

    const availablePerks = Object.values(PERKS);
    const selectedPerks = new Set<(typeof PERKS)[PerkType]>();

    while (selectedPerks.size < numPerks) {
      const randomPerk =
        availablePerks[Math.floor(Math.random() * availablePerks.length)];
      selectedPerks.add(randomPerk);
    }

    return Array.from(selectedPerks);
  }

  // Player Connection Management
  addPlayer(ws: WebSocket, playerName: string): string {
    const crew = this.gameState.addCrew(playerName);
    this.playerConnections.set(crew.id, { ws, crewId: crew.id });
    return crew.id;
  }

  reconnectPlayer(crewId: string, ws: WebSocket): void {
    if (this.disconnectedPlayers.has(crewId)) {
      this.disconnectedPlayers.delete(crewId);
    }
    this.playerConnections.set(crewId, { ws, crewId });
  }

  disconnectPlayer(crewId: string): void {
    this.playerConnections.delete(crewId);
    this.disconnectedPlayers.add(crewId);

    // Start a timeout to remove the player if they don't reconnect
    setTimeout(() => {
      if (this.disconnectedPlayers.has(crewId)) {
        this.removePlayer(crewId);
        this.disconnectedPlayers.delete(crewId);
      }
    }, 1000 * 60 * 30); // 30 minutes timeout
  }

  removePlayer(crewId: string): void {
    this.gameState.removeCrew(crewId);
    this.playerConnections.delete(crewId);
    this.disconnectedPlayers.delete(crewId);
  }

  getCrew(crewId: string) {
    return this.gameState.getCrew(crewId);
  }

  // Game Actions
  hireCrewMember(crewId: string): boolean {
    const crew = this.gameState.getCrew(crewId);
    if (!crew) return false;

    if (crew.capital >= CREW_MEMBER_COST) {
      const newMember: CrewMember = {
        id: generateId(),
        name: this.generateRandomName(),
        perks: [],
        action: Action.None,
        status: CrewMemberStatus.Healthy,
      };

      crew.crewMembers.push(newMember);
      crew.capital -= CREW_MEMBER_COST;
      this.gameState.updateCrew(crew);
      return true;
    }
    return false;
  }

  buyPerk(crewId: string, memberId: string, perkType: PerkType): boolean {
    const crew = this.gameState.getCrew(crewId);
    if (!crew) return false;

    const member = crew.crewMembers.find((m) => m.id === memberId);
    if (!member) return false;

    const perk = PERKS[perkType];
    if (!perk) return false;

    // Check if member already has this perk
    if (member.perks.some((p) => p.type === perkType)) {
      return false;
    }

    // Check if crew can afford the perk
    if (crew.capital < perk.cost) {
      return false;
    }

    // Purchase the perk
    member.perks.push(perk);
    crew.capital -= perk.cost;
    this.gameState.updateCrew(crew);
    return true;
  }

  planAttack(crewId: string, bankId: string, memberIds: string[]): Attack {
    const crew = this.gameState.getCrew(crewId);
    const bank = this.gameState.getBank(bankId);
    if (!crew || !bank) throw new Error("Invalid crew or bank");

    const selectedMembers = crew.crewMembers.filter((m) =>
      memberIds.includes(m.id)
    );
    if (selectedMembers.length === 0)
      throw new Error("No valid crew members selected");

    const attack: Attack = {
      id: generateId(),
      bank,
      attackingCrews: [
        {
          crew,
          crewMembers: selectedMembers,
          type: AttackType.Hostile,
          roleAssignments: {},
          strategy: crew.strategy,
        },
      ],
      timestamp: Date.now(),
    };

    return attack;
  }

  executeAttack(attack: Attack): Attack {
    let remainingAttackers: CrewMember[] = [];
    const allAttackers = attack.attackingCrews.flatMap((ac) => ac.crewMembers);

    // First, resolve crew vs crew combat if there are hostile crews
    const hostileCrews = attack.attackingCrews.filter(
      (ac) => ac.type === AttackType.Hostile
    );
    const cooperativeCrews = attack.attackingCrews.filter(
      (ac) => ac.type === AttackType.Cooperative
    );

    if (hostileCrews.length > 0) {
      // If all crews are hostile, they fight each other first
      if (cooperativeCrews.length === 0) {
        const combatResult = this.executeCombat(
          hostileCrews[0].crewMembers,
          hostileCrews.slice(1).flatMap((c) => c.crewMembers)
        );
        remainingAttackers = combatResult.survivors;
        this.processCasualties(combatResult);
      } else {
        // Let cooperative crews attempt the heist first
        const bankResult = this.executeBankHeist(
          attack.bank,
          cooperativeCrews.flatMap((c) => c.crewMembers)
        );
        if (
          bankResult.outcome === AttackOutcome.Success ||
          bankResult.outcome === AttackOutcome.Partial
        ) {
          // Hostile crews attack the returning successful crews
          const combatResult = this.executeCombat(
            hostileCrews.flatMap((c) => c.crewMembers),
            bankResult.survivors
          );
          remainingAttackers = combatResult.survivors;
          this.processCasualties(combatResult);
          attack.outcome =
            combatResult.outcome === CombatOutcome.Victory
              ? AttackOutcome.Success
              : AttackOutcome.Failure;
        }
      }
    } else {
      // All crews are cooperative, they work together
      const bankResult = this.executeBankHeist(attack.bank, allAttackers);
      remainingAttackers = bankResult.survivors;
      attack.outcome = bankResult.outcome;
    }

    // Calculate and distribute loot if any survivors
    if (
      remainingAttackers.length > 0 &&
      attack.outcome === AttackOutcome.Success
    ) {
      const lootPerMember = Math.floor(
        attack.bank.lootPotential / remainingAttackers.length
      );
      attack.loot = {
        type: "money",
        amount: lootPerMember * remainingAttackers.length,
      };

      // Distribute loot to surviving crews
      remainingAttackers.forEach((survivor) => {
        const crew = this.findCrewByMemberId(survivor.id);
        if (crew) {
          crew.capital += lootPerMember;
          this.gameState.updateCrew(crew);
        }
      });
    }

    return attack;
  }

  private executeBankHeist(
    bank: Bank,
    attackers: CrewMember[]
  ): { outcome: AttackOutcome; survivors: CrewMember[] } {
    const totalAttackPower = attackers.reduce((power, member) => {
      let memberPower = 10; // Base power
      member.perks.forEach((perk) => {
        memberPower += perk.power;
      });
      return power + memberPower;
    }, 0);

    const defenseStrength =
      bank.guardsCurrent * 10 + bank.securityFeatures.length * 5;
    const successRate = calculateSuccess(totalAttackPower, defenseStrength);

    // Process casualties based on bank defense
    const survivors = attackers.filter((member) => {
      const baseChance = successRate / 100;
      const gunBonus = member.perks.some((p) => p.type === PerkType.Gun)
        ? 0.2
        : 0;
      const survivalChance = Math.min(0.95, baseChance + gunBonus); // Cap at 95% chance
      return Math.random() < survivalChance;
    });

    return {
      outcome:
        successRate >= 70
          ? AttackOutcome.Success
          : successRate >= 30
          ? AttackOutcome.Partial
          : AttackOutcome.Failure,
      survivors,
    };
  }

  private processCasualties(combatResult: CombatResult): void {
    combatResult.casualties.forEach((casualty) => {
      const crew = this.findCrewByMemberId(casualty.id);
      if (!crew) return;

      // Mark the casualty as dead instead of removing them
      const member = crew.crewMembers.find((m) => m.id === casualty.id);
      if (member) {
        member.status = CrewMemberStatus.Dead;
      }

      // Generate death report
      const hasPhone = casualty.perks.some((p) => p.type === PerkType.Phone);
      const lastWords = hasPhone ? this.generateLastWords(casualty) : undefined;

      const report: TurnReport = {
        crewMemberId: casualty.id,
        message:
          hasPhone && lastWords
            ? lastWords
            : `${casualty.name} was lost during the operation.`,
        details: {
          causeOfDeath: this.generateCauseOfDeath(combatResult.phase),
          lastWords: lastWords,
        },
      };

      crew.turnReports = crew.turnReports || [];
      crew.turnReports.push(report);
      this.gameState.updateCrew(crew);
    });
  }

  private generateLastWords(casualty: CrewMember): string {
    const lastWords = [
      `*Final transmission from ${casualty.name}* Boss, it's been an honor serving in your crew. No regrets...`,
      `*${casualty.name}'s last message* Tell the others... our legacy lives on... make them proud...`,
      `*Static crackles* The money's hidden in... *cough* ...worth every penny... *transmission ends*`,
      `*${casualty.name}'s dying words* They got me good, but I took some of them with me. Went down fighting...`,
      `*Last radio message* Keep hitting them where it hurts, crew... ${casualty.name} signing off forever...`,
    ];
    return lastWords[Math.floor(Math.random() * lastWords.length)];
  }

  private generateCauseOfDeath(phase: CombatPhase): string {
    switch (phase) {
      case CombatPhase.CrewVsCrew:
        return "Killed in crew combat";
      case CombatPhase.CrewVsBank:
        return "Lost during bank heist";
      case CombatPhase.CrewVsLoot:
        return "Killed defending the loot";
      default:
        return "Unknown circumstances";
    }
  }

  private generateCombatDetails(
    outcome: CombatOutcome,
    casualties: CrewMember[],
    survivors: CrewMember[]
  ): string {
    const casualtyCount = casualties.length;
    const survivorCount = survivors.length;

    switch (outcome) {
      case CombatOutcome.Victory:
        return `Decisive victory with ${casualtyCount} casualties and ${survivorCount} survivors.`;
      case CombatOutcome.Defeat:
        return `Devastating defeat with ${casualtyCount} casualties.`;
      case CombatOutcome.MutualDestruction:
        return `Brutal combat resulted in heavy casualties on all sides. ${survivorCount} survived.`;
      default:
        return "Combat concluded.";
    }
  }

  private executeCombat(
    attackers: CrewMember[],
    defenders: CrewMember[]
  ): CombatResult {
    const calculateTeamPower = (members: CrewMember[]): number => {
      return members.reduce((power, member) => {
        let memberPower = 10; // Base power
        // Gun perk significantly increases combat power
        const gunPerk = member.perks.find((p) => p.type === PerkType.Gun);
        if (gunPerk) {
          memberPower += gunPerk.power * 3; // Triple the gun's power in crew vs crew combat
        }
        return power + memberPower;
      }, 0);
    };

    const attackerPower = calculateTeamPower(attackers);
    const defenderPower = calculateTeamPower(defenders);

    // Add some randomness to the combat
    const randomFactor = 0.8 + Math.random() * 0.4; // Random factor between 0.8 and 1.2
    const effectiveAttackerPower = attackerPower * randomFactor;

    const casualties: CrewMember[] = [];
    const survivors: CrewMember[] = [];
    let outcome: CombatOutcome;

    // Calculate survival chance for each member based on power difference
    const processCasualties = (members: CrewMember[], isWinning: boolean) => {
      members.forEach((member) => {
        const baseChance = isWinning ? 0.8 : 0.3;
        const gunBonus = member.perks.some((p) => p.type === PerkType.Gun)
          ? 0.1
          : 0;
        const survivalChance = baseChance + gunBonus;

        if (Math.random() > survivalChance) {
          casualties.push(member);
        } else {
          survivors.push(member);
        }
      });
    };

    if (effectiveAttackerPower > defenderPower * 1.2) {
      // Clear victory for attackers
      outcome = CombatOutcome.Victory;
      processCasualties(attackers, true);
      processCasualties(defenders, false);
    } else if (defenderPower > effectiveAttackerPower * 1.2) {
      // Clear victory for defenders
      outcome = CombatOutcome.Defeat;
      processCasualties(attackers, false);
      processCasualties(defenders, true);
    } else {
      // Close combat, high casualties on both sides
      outcome = CombatOutcome.MutualDestruction;
      processCasualties(attackers, false);
      processCasualties(defenders, false);
    }

    return {
      phase: CombatPhase.CrewVsCrew,
      outcome,
      casualties,
      survivors,
      details: this.generateCombatDetails(outcome, casualties, survivors),
    };
  }

  private initializeBanks(): void {
    const defaultBanks: Bank[] = [
      {
        id: generateId(),
        name: "Small Town Bank",
        capital: 100000,
        guardMin: 2,
        guardMax: 4,
        guardsCurrent: 3,
        difficultyLevel: 1,
        lootPotential: 10000,
        securityFeatures: ["Basic Alarm", "Cameras"],
        attackHistory: [],
      },
      {
        id: generateId(),
        name: "City Central Bank",
        capital: 1000000,
        guardMin: 5,
        guardMax: 10,
        guardsCurrent: 7,
        difficultyLevel: 3,
        lootPotential: 100000,
        securityFeatures: [
          "Advanced Alarm",
          "Armed Guards",
          "Vault Timer",
          "Security Doors",
        ],
        attackHistory: [],
      },
    ];

    defaultBanks.forEach((bank) => this.gameState.addBank(bank));
  }

  // Broadcast game updates to all connected players
  broadcastGameState(): void {
    const gameStateJson = this.gameState.serialize();
    this.playerConnections.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "gameState", data: gameStateJson }));
      }
    });
  }

  private createAttack(bank: Bank, members: CrewMember[]): Attack {
    // Group members by crew and their attack types
    const crewMembers = new Map<
      string,
      { members: CrewMember[]; type: AttackType }
    >();
    members.forEach((member) => {
      const crew = this.findCrewByMemberId(member.id);
      if (!crew) return;

      const crewId = crew.id;
      const existing = crewMembers.get(crewId);
      if (existing) {
        existing.members.push(member);
      } else {
        crewMembers.set(crewId, {
          members: [member],
          type: member.plannedAction?.attackType || AttackType.Hostile,
        });
      }
    });

    // Create attacking crews
    const attackingCrews: AttackingCrew[] = Array.from(
      crewMembers.entries()
    ).map(([crewId, { members, type }]) => {
      const crew = this.gameState.getCrew(crewId);
      if (!crew) throw new Error("Invalid crew");

      return {
        crew,
        crewMembers: members,
        type,
        roleAssignments: {},
        strategy: crew.strategy,
      };
    });

    return {
      id: generateId(),
      bank,
      attackingCrews,
      timestamp: Date.now(),
    };
  }

  private findCrewByMemberId(memberId: string): Crew | undefined {
    return this.gameState
      .getAllCrews()
      .find((crew) =>
        crew.crewMembers.some((member) => member.id === memberId)
      );
  }
}
