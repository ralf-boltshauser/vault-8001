import { WebSocket } from "ws";
import { GameState } from "../models/GameState.js";
import {
  Action,
  Attack,
  AttackOutcome,
  AttackType,
  AttackingCrew,
  Bank,
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

    // Group all attacks by bank
    crews.forEach((crew) => {
      crew.crewMembers.forEach((member) => {
        if (
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

    // Resolve each bank attack
    bankAttacks.forEach((attackers, bankId) => {
      const bank = this.gameState.getBank(bankId);
      if (!bank) return;

      // Group attackers by crew and collaboration
      const attackGroups = this.groupAttackers(attackers);

      // Resolve each attack group
      attackGroups.forEach((group) => {
        const attack = this.createAttack(bank, group);
        const result = this.executeAttack(attack);
        this.generateReports(result);
      });
    });

    // Reset for next turn
    this.prepareNextTurn();
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
        member.plannedAction = undefined;
      });
      this.gameState.updateCrew(crew);
    });

    this.gameState.setPhase(GamePhase.Report);
    this.broadcastGameState();

    // After a delay, move to next planning phase
    setTimeout(() => {
      this.gameState.setPhase(GamePhase.Planning);
      this.gameState.setTurnNumber(this.gameState.getTurnNumber() + 1);
      this.broadcastGameState();
    }, 10000); // 10 seconds to read reports
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
    // Calculate attack power based on number of crew members and their perks
    const totalAttackPower = attack.attackingCrews.reduce(
      (power: number, attackingCrew: AttackingCrew) => {
        return (
          power +
          attackingCrew.crewMembers.reduce(
            (memberPower: number, member: CrewMember) => {
              // Base power per member
              let memberTotal = 10;
              // Add power from perks
              member.perks.forEach((perk) => {
                memberTotal += perk.power;
              });
              return memberPower + memberTotal;
            },
            0
          )
        );
      },
      0
    );

    const defenseStrength =
      attack.bank.guardsCurrent * 10 + attack.bank.securityFeatures.length * 5;
    const successRate = calculateSuccess(totalAttackPower, defenseStrength);

    if (successRate >= 70) {
      attack.outcome = AttackOutcome.Success;
      attack.loot = {
        type: "money",
        amount: Math.floor(attack.bank.lootPotential * (successRate / 100)),
      };
    } else if (successRate >= 30) {
      attack.outcome = AttackOutcome.Partial;
      attack.loot = {
        type: "money",
        amount: Math.floor(attack.bank.lootPotential * (successRate / 200)),
      };
    } else {
      attack.outcome = AttackOutcome.Failure;
    }

    this.applyAttackOutcome(attack);
    return attack;
  }

  private applyAttackOutcome(attack: Attack): void {
    const bank = attack.bank;
    bank.attackHistory.push(attack);

    attack.attackingCrews.forEach((attackingCrew: AttackingCrew) => {
      const crew = this.gameState.getCrew(attackingCrew.crew.id);
      if (!crew) return;

      if (attack.outcome === AttackOutcome.Success) {
        crew.capital += attack.loot?.amount || 0;
        crew.reputation += 10;
      } else if (attack.outcome === AttackOutcome.Partial) {
        crew.capital += attack.loot?.amount || 0;
        crew.reputation += 5;
      } else {
        crew.reputation -= 5;
      }

      this.gameState.updateCrew(crew);
    });

    this.gameState.updateBank(bank);
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
    // Group members by crew
    const crewMembers = new Map<string, CrewMember[]>();
    members.forEach((member) => {
      const crew = this.findCrewByMemberId(member.id);
      if (!crew) return;

      const crewId = crew.id;
      const members = crewMembers.get(crewId) || [];
      members.push(member);
      crewMembers.set(crewId, members);
    });

    // Create attacking crews
    const attackingCrews: AttackingCrew[] = Array.from(
      crewMembers.entries()
    ).map(([crewId, members]) => {
      const crew = this.gameState.getCrew(crewId);
      if (!crew) throw new Error("Invalid crew");

      return {
        crew,
        crewMembers: members,
        type:
          members.length === members.length
            ? AttackType.Cooperative
            : AttackType.Hostile,
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
