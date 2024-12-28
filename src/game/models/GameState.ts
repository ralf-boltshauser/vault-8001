import {
  Bank,
  ChatThread,
  Crew,
  GamePhase,
  Strategy,
} from "../types/game.types";
import { generateId } from "../utils/helpers";

export interface SerializedGameState {
  crews: [string, Crew][];
  banks: [string, Bank][];
  phase: GamePhase;
  turnNumber: number;
  chatThreads: [string, ChatThread][];
}

export class GameState {
  private static instance: GameState;
  private crews: Map<string, Crew> = new Map();
  private banks: Map<string, Bank> = new Map();
  private phase: GamePhase = GamePhase.Initialization;
  private turnNumber: number = 0;
  private chatThreads: Map<string, ChatThread> = new Map();
  private minPlayersToStart: number = 2;
  private maxPlayersAllowed: number = 8; // Configurable max players
  private isAcceptingPlayers: boolean = true;

  private constructor() {}

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  // Bank Generation
  private generateBanks(): void {
    this.banks.clear();
    const playerCount = this.crews.size;

    // Generate small banks (1 per player)
    for (let i = 0; i < playerCount; i++) {
      const bank: Bank = {
        id: generateId(),
        name: `Local Bank ${i + 1}`,
        guardMin: 2,
        guardMax: 5,
        guardsCurrent: 3,
        difficultyLevel: 1,
        lootPotential: 50000,
        minLootPotential: 50000,
        securityFeatures: ["Basic Alarm"],
        attackHistory: [],
      };
      this.banks.set(bank.id, bank);
    }

    // Generate medium banks (1 per 2 players)
    const mediumBankCount = Math.floor(playerCount / 2);
    for (let i = 0; i < mediumBankCount; i++) {
      const bank: Bank = {
        id: generateId(),
        name: `Regional Bank ${i + 1}`,
        guardMin: 4,
        guardMax: 8,
        guardsCurrent: 6,
        difficultyLevel: 2,
        lootPotential: 100000,
        minLootPotential: 100000,
        securityFeatures: ["Advanced Alarm", "Security Cameras"],
        attackHistory: [],
      };
      this.banks.set(bank.id, bank);
    }

    // Generate one big bank per 4 players
    const bigBankCount = Math.floor(playerCount / 4);
    for (let i = 0; i < bigBankCount; i++) {
      const bank: Bank = {
        id: generateId(),
        name: `National Bank ${i + 1}`,
        guardMin: 8,
        guardMax: 15,
        guardsCurrent: 10,
        difficultyLevel: 3,
        lootPotential: 200000,
        minLootPotential: 200000,
        securityFeatures: [
          "Advanced Alarm",
          "Security Cameras",
          "Armed Guards",
          "Vault Timer",
        ],
        attackHistory: [],
      };
      this.banks.set(bank.id, bank);
    }
  }

  // Game Start Control
  public canAcceptMorePlayers(): boolean {
    return this.isAcceptingPlayers && this.crews.size < this.maxPlayersAllowed;
  }

  public isReadyToStart(): boolean {
    return (
      this.phase === GamePhase.Initialization &&
      this.crews.size >= this.minPlayersToStart
    );
  }

  public startGame(): boolean {
    if (!this.isReadyToStart()) {
      return false;
    }

    this.isAcceptingPlayers = false;
    this.generateBanks();
    this.phase = GamePhase.Planning;
    this.turnNumber = 1;
    return true;
  }

  // Getters
  getAllCrews(): Crew[] {
    return Array.from(this.crews.values());
  }

  getCrew(id: string): Crew | undefined {
    return this.crews.get(id);
  }

  getAllBanks(): Bank[] {
    return Array.from(this.banks.values());
  }

  getBank(id: string): Bank | undefined {
    return this.banks.get(id);
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getTurnNumber(): number {
    return this.turnNumber;
  }

  // Chat-related methods
  public getChatThread(threadId: string): ChatThread | undefined {
    return this.chatThreads.get(threadId);
  }

  public getAllChatThreads(): ChatThread[] {
    return Array.from(this.chatThreads.values());
  }

  public getChatThreadsForCrew(crewId: string): ChatThread[] {
    return Array.from(this.chatThreads.values()).filter((thread) =>
      thread.participants.includes(crewId)
    );
  }

  public addChatThread(thread: ChatThread): void {
    this.chatThreads.set(thread.id, thread);
  }

  public updateChatThread(thread: ChatThread): void {
    this.chatThreads.set(thread.id, thread);
  }

  // Setters
  addCrew(name: string): Crew {
    if (!this.canAcceptMorePlayers()) {
      throw new Error(
        this.isAcceptingPlayers
          ? "Maximum number of players reached"
          : "Game has already started"
      );
    }

    let id = generateId();
    if (name === "Ralf's Crew") {
      id = "ykb07swcgaq";
    }

    const crew: Crew = {
      id,
      name,
      capital: 200000,
      lastCapital: 200000,
      turnCapitalGain: 0,
      crewMembers: [],
      reputation: 0,
      morale: 100,
      incomePerTurn: 0,
      strategy: Strategy.Stealthy,
      isReadyForNextPhase: false,
      turnReports: [],
    };
    this.crews.set(crew.id, crew);
    return crew;
  }

  addCrewWithId(crew: Crew): void {
    this.crews.set(crew.id, crew);
  }

  updateCrew(crew: Crew): void {
    this.crews.set(crew.id, crew);
  }

  removeCrew(id: string): void {
    this.crews.delete(id);
  }

  addBank(bank: Bank): void {
    this.banks.set(bank.id, bank);
  }

  updateBank(bank: Bank): void {
    this.banks.set(bank.id, bank);
  }

  setPhase(phase: GamePhase): void {
    this.phase = phase;
  }

  setTurnNumber(turnNumber: number): void {
    this.turnNumber = turnNumber;
  }

  // Serialization
  public serialize(): string {
    const data = {
      crews: Array.from(this.crews.entries()),
      banks: Array.from(
        [...this.banks.entries()].map(([key, value]) => [
          key,
          {
            ...value,
            attackHistory: value.attackHistory.map((attack) => ({
              ...attack,
              bank: undefined,
            })),
          },
        ])
      ),
      phase: this.phase,
      turnNumber: this.turnNumber,
      chatThreads: Array.from(this.chatThreads.entries()),
    };
    return JSON.stringify(data);
  }

  public deserialize(serializedData: string): void {
    const data = JSON.parse(serializedData) as SerializedGameState;
    this.crews = new Map(data.crews);
    this.banks = new Map(data.banks);
    this.phase = data.phase;
    this.turnNumber = data.turnNumber;
    this.chatThreads = new Map(data.chatThreads);
  }

  public getMinPlayersToStart(): number {
    return this.minPlayersToStart;
  }

  public setMinPlayersToStart(count: number): void {
    this.minPlayersToStart = count;
  }

  // Configuration methods
  public getMaxPlayers(): number {
    return this.maxPlayersAllowed;
  }

  public setMaxPlayers(count: number): void {
    if (this.crews.size > count) {
      throw new Error("Cannot set max players below current player count");
    }
    this.maxPlayersAllowed = count;
  }

  public getCurrentPlayerCount(): number {
    return this.crews.size;
  }
}
