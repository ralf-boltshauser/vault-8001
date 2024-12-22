import { Bank, Crew, GamePhase, Strategy } from "../types/game.types";
import { generateId } from "../utils/helpers";

export class GameState {
  private static instance: GameState;
  private crews: Map<string, Crew> = new Map();
  private banks: Map<string, Bank> = new Map();
  private phase: GamePhase = GamePhase.Planning;
  private turnNumber: number = 1;

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

  // Setters
  addCrew(name: string): Crew {
    // Use specific IDs for Ralf and Robin
    let id = generateId();
    if (name === "Ralf's Crew") {
      id = "ykb07swcgaq";
    } else if (name === "Robin's Crew") {
      id = "qrjqhdkhak8";
    }

    const crew: Crew = {
      id,
      name,
      capital: 0,
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
  serialize(): string {
    const state = {
      phase: this.phase,
      turnNumber: this.turnNumber,
      crews: Array.from(this.crews.entries()),
      banks: Array.from(this.banks.entries()).map(([id, bank]) => {
        // Create a copy of the bank without circular references
        const { attackHistory, ...bankWithoutHistory } = bank;
        return [
          id,
          {
            ...bankWithoutHistory,
            // Only include essential attack information
            attackHistory: attackHistory.map((attack) => ({
              id: attack.id,
              outcome: attack.outcome,
              timestamp: attack.timestamp,
              loot: attack.loot,
              attackingCrews: attack.attackingCrews.map((crew) => ({
                crew: { id: crew.crew.id, name: crew.crew.name },
                type: crew.type,
                strategy: crew.strategy,
              })),
            })),
          },
        ];
      }),
    };
    return JSON.stringify(state);
  }
}
