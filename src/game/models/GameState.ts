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
  private phase: GamePhase = GamePhase.Planning;
  private turnNumber: number = 1;
  private chatThreads: Map<string, ChatThread> = new Map();

  private constructor() {}

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
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
    // Use specific IDs for Ralf
    console.log("Adding crew", name);
    let id = generateId();
    if (name === "Ralf's Crew") {
      id = "ykb07swcgaq";
    }

    const crew: Crew = {
      id,
      name,
      capital: 200000,
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
}
