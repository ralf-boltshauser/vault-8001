import { WebSocket } from "ws";
import { calculateWorkSalary, GAME_CONFIG } from "../config/gameConfig";
import { GameState } from "../models/GameState.js";
import {
  Action,
  Attack,
  AttackingCrew,
  AttackOutcome,
  AttackType,
  Bank,
  ChatThread,
  Crew,
  CrewMember,
  CrewMemberStatus,
  GamePhase,
  PERKS,
  PerkType,
  PlannedAction,
  TurnReport,
} from "../types/game.types.js";
import { generateId } from "../utils/helpers.js";
import { BankService } from "./BankService";
import { CombatService } from "./CombatService";
import { ReportService } from "./ReportService";

interface PlayerConnection {
  ws: WebSocket;
  crewId: string;
}

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
  private publicConnections: Set<WebSocket> = new Set();
  private disconnectedPlayers: Set<string> = new Set();
  private combatService: CombatService;
  private reportService: ReportService;
  private bankService: BankService;

  private constructor() {
    this.gameState = GameState.getInstance();
    this.combatService = new CombatService();
    this.reportService = new ReportService();
    this.bankService = BankService.getInstance();
    this.initializeDefaultPlayers();
  }

  static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  private initializeDefaultPlayers(): void {
    // Create Ralf's crew
    const ralf = this.gameState.addCrew("Ralf's Crew");
    ralf.capital = 200000;
    ralf.crewMembers = [
      {
        id: generateId(),
        name: "Shadow-106",
        perks: [],
        action: Action.None,
        status: CrewMemberStatus.Healthy,
      },
      {
        id: generateId(),
        name: "Wolf-346",
        perks: [],
        action: Action.None,
        status: CrewMemberStatus.Healthy,
      },
      {
        id: generateId(),
        name: "Fox-927",
        perks: [],
        action: Action.None,
        status: CrewMemberStatus.Healthy,
      },
      {
        id: generateId(),
        name: "Echo-413",
        perks: [],
        action: Action.None,
        status: CrewMemberStatus.Healthy,
      },
      {
        id: generateId(),
        name: "Raven-410",
        perks: [],
        action: Action.None,
        status: CrewMemberStatus.Healthy,
      },
    ];
    this.gameState.updateCrew(ralf);
  }

  // Turn Management
  markCrewReady(crewId: string): void {
    const crew = this.gameState.getCrew(crewId);
    if (!crew) return;

    // Verify all HEALTHY crew members have actions assigned
    const allHealthyMembersHaveActions = crew.crewMembers
      .filter((member) => member.status === CrewMemberStatus.Healthy)
      .every((member) => member.plannedAction || member.action !== Action.None);

    if (!allHealthyMembersHaveActions) {
      throw new Error("All healthy crew members must have actions assigned");
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
        crew.capital += GAME_CONFIG.BASIC_INCOME; // Basic income for having no healthy crew
        crew.turnReports = [
          {
            crewMemberId: "system",
            message:
              "With no healthy crew members to manage, you earned basic income from regular work.",
            details: {
              earnings: GAME_CONFIG.BASIC_INCOME,
            },
          },
        ];
        this.gameState.updateCrew(crew);
      }
    });

    // First, collect all attacks per bank
    crews.forEach((crew) => {
      crew.crewMembers.forEach((member) => {
        if (member.plannedAction?.type === Action.Work) {
          this.resolveWorkAction(crew, member);
        } else if (
          member.plannedAction?.type === Action.Attack &&
          member.plannedAction.targetId &&
          member.status === CrewMemberStatus.Healthy // Only healthy members can attack
        ) {
          const attackers =
            bankAttacks.get(member.plannedAction.targetId) || [];
          attackers.push(member);
          bankAttacks.set(member.plannedAction.targetId, attackers);
        }
      });
    });

    // Then handle bank attacks - one heist per bank
    bankAttacks.forEach((attackers, bankId) => {
      const bank = this.gameState.getBank(bankId);
      if (!bank) return;

      // All attackers for this bank are grouped into one heist
      const attack = this.createAttack(bank, attackers);
      const result = this.executeAttack(attack);
      this.generateReports(result);

      // Update bank in game state
      this.gameState.updateBank(bank);
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

    // Add to turn reports
    crew.turnReports = crew.turnReports || [];
    crew.turnReports.push(report);

    // Update crew in game state
    this.gameState.updateCrew(crew);
  }

  private groupAttackers(attackers: CrewMember[]): CrewMember[][] {
    // Instead of grouping by collaborators, we just return all attackers as one group
    // since they're all attacking the same bank
    return attackers.length > 0 ? [attackers] : [];
  }

  private generateReports(attack: Attack): void {
    if (!attack.winners || attack.winners.length == 0) {
      if (attack.emptySurvivors && attack.emptySurvivors.length > 0) {
        attack.emptySurvivors.forEach((member) => {
          const crew = this.findCrewByMemberId(member.id);
          if (!crew) return;

          const report = this.reportService.generateMemberReport(
            attack,
            member,
            0
          );
          crew.turnReports = crew.turnReports || [];
          crew.turnReports.push(report);
          this.gameState.updateCrew(crew);
        });
      }
      return;
    }

    if (!attack.winners) return;

    const lootPerMember = Math.floor(
      attack.loot?.amount && attack.winners?.length
        ? attack.loot.amount / attack.winners.length
        : 0
    );

    for (const winner of attack.winners) {
      const crew = this.findCrewByMemberId(winner.id);
      if (!crew) continue;

      const report = this.reportService.generateMemberReport(
        attack,
        winner,
        lootPerMember
      );
      crew.turnReports = crew.turnReports || [];
      crew.turnReports.push(report);
      this.gameState.updateCrew(crew);
    }
  }

  private prepareNextTurn(): void {
    // Process end of day for banks
    this.bankService.processEndOfDay();

    // Reset crew ready states
    this.gameState.getAllCrews().forEach((crew) => {
      crew.isReadyForNextPhase = false;

      crew.crewMembers.forEach((member) => {
        // Handle jail terms
        if (
          member.status === CrewMemberStatus.Arrested &&
          member.jailTerm !== undefined
        ) {
          member.jailTerm--;
          if (member.jailTerm <= 0) {
            member.status = CrewMemberStatus.Healthy;
            member.jailTerm = undefined;

            // Add to existing reports instead of replacing
            crew.turnReports = crew.turnReports || [];
            crew.turnReports.push({
              crewMemberId: member.id,
              message: `${member.name} has been released from jail and is ready for action.`,
              details: {},
            });
          }
        }

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

  // Player Connection Management
  addPlayer(ws: WebSocket, playerName: string): string {
    const crew = this.gameState.addCrew(playerName);
    this.playerConnections.set(crew.id, { ws, crewId: crew.id });

    // Initialize chat threads with all existing players
    this.gameState.getAllCrews().forEach((otherCrew) => {
      if (otherCrew.id !== crew.id) {
        const threadId = generateId();
        const thread: ChatThread = {
          id: threadId,
          participants: [crew.id, otherCrew.id],
          messages: [],
          information: [],
          createdAt: Date.now(),
          lastActivity: Date.now(),
        };
        this.gameState.addChatThread(thread);
      }
    });

    return crew.id;
  }

  reconnectPlayer(crewId: string, ws: WebSocket): void {
    if (this.disconnectedPlayers.has(crewId)) {
      this.disconnectedPlayers.delete(crewId);
    }
    this.playerConnections.set(crewId, { ws, crewId });
  }

  addPublicViewer(ws: WebSocket): void {
    this.publicConnections.add(ws);
    // Send initial game state
    const gameStateJson = this.gameState.serialize();
    ws.send(JSON.stringify({ type: "gameState", data: gameStateJson }));
  }

  reconnectPublicViewer(ws: WebSocket): void {
    this.publicConnections.add(ws);
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
    }, GAME_CONFIG.DISCONNECT_TIMEOUT); // 30 minutes timeout
  }

  removePlayer(crewId: string): void {
    this.gameState.removeCrew(crewId);
    this.playerConnections.delete(crewId);
    this.disconnectedPlayers.delete(crewId);
  }

  getCrew(crewId: string) {
    return this.gameState.getCrew(crewId);
  }

  getBank(bankId: string): Bank | undefined {
    return this.bankService.getBank(bankId);
  }

  getAllBanks(): Bank[] {
    return this.bankService.getAllBanks();
  }

  // Game Actions
  hireCrewMember(crewId: string): boolean {
    const crew = this.gameState.getCrew(crewId);
    if (!crew) return false;

    if (crew.capital >= GAME_CONFIG.CREW_MEMBER_COST) {
      const newMember: CrewMember = {
        id: generateId(),
        name: this.generateRandomName(),
        perks: [],
        action: Action.None,
        status: CrewMemberStatus.Healthy,
      };

      crew.crewMembers.push(newMember);
      crew.capital -= GAME_CONFIG.CREW_MEMBER_COST;
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
      turnNumber: this.gameState.getTurnNumber(),
      isPublic: false,
    };

    return attack;
  }

  executeAttack(attack: Attack): Attack {
    // Separate crews by type
    const coopCrews = attack.attackingCrews
      .filter((ac) => ac.type === AttackType.Cooperative)
      .map((ac) => ac.crewMembers);

    const hostileCrews = attack.attackingCrews
      .filter((ac) => ac.type === AttackType.Hostile)
      .map((ac) => ac.crewMembers);

    // Execute combat using new CombatService
    const combatResult = this.combatService.multiCrewCombat(
      coopCrews,
      hostileCrews,
      attack.bank.guardsCurrent
    );

    // Store winners in attack object
    attack.winners = combatResult.winners;
    attack.emptySurvivors = combatResult.emptySurvivors;

    // Process casualties
    combatResult.casualties.forEach((casualty) => {
      // Skip guard casualties
      if (casualty.type === "guard") return;

      const crew = this.findCrewByMemberId(casualty.combatant.id);
      if (!crew) return;

      const member = crew.crewMembers.find(
        (m) => m.id === casualty.combatant.id
      );
      if (!member) return;

      // Update member status
      if (casualty.died) {
        member.status = CrewMemberStatus.Dead;
      } else if (casualty.jailed) {
        member.status = CrewMemberStatus.Arrested;
        member.jailTerm = casualty.jailTerm;
      }

      this.gameState.updateCrew(crew);
    });

    // Set attack outcome
    if (combatResult.remainingDefenders > 0) {
      attack.outcome = AttackOutcome.Failure;
    } else if (combatResult.winners.length > 0) {
      attack.outcome = AttackOutcome.Success;

      // Calculate and distribute loot
      const lootPerMember = Math.floor(
        attack.bank.lootPotential / combatResult.winners.length
      );
      attack.loot = {
        type: "money",
        amount: lootPerMember * combatResult.winners.length,
      };

      // Distribute loot to surviving crews
      const survivingCrews = new Map<string, number>(); // crewId -> number of survivors

      combatResult.winners.forEach((survivor) => {
        const crew = this.findCrewByMemberId(survivor.id);
        if (!crew) return;

        survivingCrews.set(crew.id, (survivingCrews.get(crew.id) || 0) + 1);
      });

      // Distribute loot proportionally to surviving crew members
      survivingCrews.forEach((survivors, crewId) => {
        const crew = this.gameState.getCrew(crewId);
        if (!crew) return;

        const crewShare = lootPerMember * survivors;
        crew.capital += crewShare;
        this.gameState.updateCrew(crew);
      });

      // Update bank after successful heist
      this.bankService.onBankRobbed(attack);
    }

    return attack;
  }

  // Public screen connection management
  addPublicConnection(ws: WebSocket): void {
    this.publicConnections.add(ws);
    // Send initial game state
    ws.send(
      JSON.stringify({ type: "gameState", data: this.gameState.serialize() })
    );
  }

  removePublicConnection(ws: WebSocket): void {
    this.publicConnections.delete(ws);
  }

  // Broadcast game updates to all connected clients
  broadcastGameState(): void {
    const gameStateJson = this.gameState.serialize();
    const message = JSON.stringify({ type: "gameState", data: gameStateJson });

    // Send to players
    this.playerConnections.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });

    // Send to public screens
    this.publicConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
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

    console.log("turn number: ", this.gameState.getTurnNumber());

    return {
      id: generateId(),
      bank,
      attackingCrews,
      timestamp: Date.now(),
      turnNumber: this.gameState.getTurnNumber(),
      isPublic: false, // By default, attacks are not public
    } as Attack;
  }

  private findCrewByMemberId(memberId: string): Crew | undefined {
    return this.gameState
      .getAllCrews()
      .find((crew) =>
        crew.crewMembers.some((member) => member.id === memberId)
      );
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
}
