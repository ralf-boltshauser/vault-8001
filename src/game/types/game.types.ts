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
  capital: number;
  guardMin: number;
  guardMax: number;
  guardsCurrent: number;
  difficultyLevel: number;
  lootPotential: number;
  securityFeatures: string[];
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
  outcome?: AttackOutcome;
  loot?: Loot;
  casualties?: Casualties;
  timestamp: number;
}

export interface GameState {
  phase: GamePhase;
  crews: Map<string, Crew>;
  banks: Map<string, Bank>;
  turnNumber: number;
}

export interface CombatResult {
  phase: CombatPhase;
  outcome: CombatOutcome;
  casualties: CrewMember[];
  survivors: CrewMember[];
  details: string;
}
