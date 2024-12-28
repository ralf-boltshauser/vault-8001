export enum Action {
  Attack = "attack",
  Work = "work",
  None = "none",
}

export enum CrewMemberStatus {
  Healthy = "healthy",
  Injured = "injured",
  Arrested = "arrested",
  Dead = "dead",
}

export enum AttackOutcome {
  Success = "success",
  Failure = "failure",
  Partial = "partial",
}

export enum AttackType {
  Hostile = "hostile",
  Cooperative = "cooperative",
}

export enum Strategy {
  Stealthy = "stealthy",
  BruteForce = "bruteForce",
  Negotiation = "negotiation",
}

export enum PerkType {
  Gun = "gun",
  Phone = "phone",
}

export enum GamePhase {
  Initialization = "initialization",
  Planning = "planning",
  Resolution = "resolution",
}

export enum CombatOutcome {
  Victory = "victory",
  Defeat = "defeat",
  MutualDestruction = "mutualDestruction",
}

export enum CombatPhase {
  CrewVsCrew = "crewVsCrew",
  CrewVsBank = "crewVsBank",
  CrewVsLoot = "crewVsLoot",
}

export interface Perk {
  type: PerkType;
  title: string;
  icon: string;
  description: string;
  cost: number;
  power: number;
}

export const PERKS: Record<PerkType, Perk> = {
  [PerkType.Gun]: {
    type: PerkType.Gun,
    title: "Armed and Ready",
    icon: "local_police",
    description: "Equip your crew member with a gun for better attack power",
    cost: 25000,
    power: 5,
  },
  [PerkType.Phone]: {
    type: PerkType.Phone,
    title: "Connected",
    icon: "smartphone",
    description: "Give your crew member a secure phone for better coordination",
    cost: 15000,
    power: 3,
  },
};

export interface PlannedAction {
  type: Action;
  targetId?: string;
  collaborators?: string[];
  attackType: AttackType;
}

export interface CrewMember {
  id: string;
  name: string;
  perks: Perk[];
  action: Action;
  status: CrewMemberStatus;
  plannedAction?: PlannedAction;
  jailTerm?: number;
}

export interface TurnReport {
  crewMemberId: string;
  message: string;
  details: {
    location?: string;
    collaborators?: string[];
    outcome?: string;
    earnings?: number;
    lastWords?: string;
    causeOfDeath?: string;
  };
}

export interface Crew {
  id: string;
  name: string;
  lastCapital: number;
  turnCapitalGain: number;
  capital: number;
  crewMembers: CrewMember[];
  reputation: number;
  morale: number;
  incomePerTurn: number;
  strategy: Strategy;
  isReadyForNextPhase: boolean;
  turnReports?: TurnReport[];
}

export interface Bank {
  id: string;
  name: string;
  guardMin: number;
  guardMax: number;
  guardsCurrent: number;
  difficultyLevel: number;
  lootPotential: number;
  minLootPotential: number;
  securityFeatures: readonly string[];
  attackHistory: Attack[];
}

export interface RoleAssignment {
  [key: string]: CrewMember;
}

export interface AttackingCrew {
  crew: Crew;
  crewMembers: CrewMember[];
  type: AttackType;
  roleAssignments: RoleAssignment;
  strategy: Strategy;
}

export interface Loot {
  type: string;
  amount: number;
}

export interface Casualties {
  crew: CrewMember[];
  guards: number;
}

export interface Attack {
  id: string;
  bank: Bank;
  attackingCrews: AttackingCrew[];
  timestamp: number;
  outcome?: AttackOutcome;
  winners?: CrewMember[];
  emptySurvivors?: CrewMember[];
  casualties?: CrewMember[];
  loot?: {
    type: string;
    amount: number;
  };
  isPublic?: boolean;
  turnNumber: number;
}

export interface GameState {
  phase: GamePhase;
  crews: Map<string, Crew>;
  banks: Map<string, Bank>;
  chatThreads: Map<string, ChatThread>;
  turnNumber: number;
}

export interface CombatResult {
  phase: CombatPhase;
  outcome: CombatOutcome;
  casualties: CrewMember[];
  survivors: CrewMember[];
  details: string;
}

export type InformationPieceType =
  | "chat_message" // Regular chat
  | "bank_evidence" // Info about bank security, schedules, etc.
  | "crew_evidence" // Info about other crews' activities
  | "heist_evidence" // Evidence of past heists
  | "spy_report" // Special spy intel
  | "interaction"; // New type for interactive elements

export interface BaseInformationPiece {
  id: string;
  senderId: string;
  timestamp: number;
  type: InformationPieceType;
  isRead: boolean;
}

export interface ChatMessagePiece extends BaseInformationPiece {
  type: "chat_message";
  content: string;
}

export interface BankEvidencePiece extends BaseInformationPiece {
  type: "bank_evidence";
  bankId: string;
  evidenceType: "guard_schedule" | "security_weakness" | "vault_details";
  details: {
    description: string;
    confidence: number;
    expiresAt?: number;
  };
}

export interface CrewEvidencePiece extends BaseInformationPiece {
  type: "crew_evidence";
  targetCrewId: string;
  evidenceType: "planned_heist" | "crew_strength" | "internal_info";
  details: {
    description: string;
    confidence: number;
  };
}

export interface HeistEvidencePiece extends BaseInformationPiece {
  type: "heist_evidence";
  heistId: string;
  evidenceType: "photo" | "witness_account" | "security_footage";
  details: {
    description: string;
    proof: string;
  };
}

export interface SpyReportPiece extends BaseInformationPiece {
  type: "spy_report";
  reportType: "surveillance" | "infiltration" | "intercepted_comms";
  details: {
    description: string;
    reliability: number;
    actionableUntil?: number;
  };
}

export enum InteractionStatus {
  Pending = "pending",
  Accepted = "accepted",
  Rejected = "rejected",
  Expired = "expired",
  Cancelled = "cancelled",
  Failed = "failed",
}

export enum InteractionType {
  MoneyTransfer = "money_transfer",
  AcceptMoneyTransfer = "accept_money_transfer",
  RejectMoneyTransfer = "reject_money_transfer",
  // Can be extended with other types like:
  // TradeProposal = "trade_proposal",
  // AllianceRequest = "alliance_request",
  // etc.
}

export interface InteractionPiece extends BaseInformationPiece {
  type: "interaction";
  interactionType: InteractionType;
  status: InteractionStatus;
  expiresAt?: number;
}

export interface MoneyTransferPiece extends InteractionPiece {
  interactionType: InteractionType.MoneyTransfer;
  amount: number;
  recipientId: string;
}

export type InformationPiece =
  | ChatMessagePiece
  | BankEvidencePiece
  | CrewEvidencePiece
  | HeistEvidencePiece
  | SpyReportPiece
  | MoneyTransferPiece;

export interface ChatThread {
  id: string;
  participants: string[]; // Crew IDs
  information: InformationPiece[];
  lastActivity: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  isRead: boolean;
}

export interface ChatThread {
  id: string;
  participants: string[];
  messages: ChatMessage[];
  createdAt: number;
  lastActivity: number;
}

// Update WebSocketMessage type to include chat messages
export type WebSocketMessage =
  | { type: "gameState"; data: string }
  | { type: "chat"; data: { threadId: string; message: ChatMessage } }
  | {
      type: "action";
      data: { crewId: string; memberId: string; action: PlannedAction };
    }
  | { type: "ready"; data: { crewId: string } };

export enum AdminAction {
  StartGame = "start_game",
  ResetGame = "reset_game",
  SetMinPlayers = "set_min_players",
  SetMaxPlayers = "set_max_players",
  KickPlayer = "kick_player",
  // Extensible for more admin actions
}
