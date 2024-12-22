import { GAME_CONFIG } from "../config/gameConfig";
import { GameState } from "../models/GameState";
import { Attack, AttackOutcome, Bank } from "../types/game.types";
import { generateId } from "../utils/helpers";

export interface BankConfig {
  name: string;
  guardMin: number;
  guardMax: number;
  guardsCurrent: number;
  difficultyLevel: number;
  lootPotential: number;
  minLootPotential: number;
  securityFeatures: readonly string[];
}

export class BankService {
  private static instance: BankService;
  private gameState: GameState;

  private constructor() {
    this.gameState = GameState.getInstance();
    this.initializeDefaultBanks();
  }

  static getInstance(): BankService {
    if (!BankService.instance) {
      BankService.instance = new BankService();
    }
    return BankService.instance;
  }

  private initializeDefaultBanks(): void {
    GAME_CONFIG.DEFAULT_BANKS.forEach((config) => {
      const mutableConfig: BankConfig = {
        ...config,
        securityFeatures: [...config.securityFeatures],
      };
      this.createBank(mutableConfig);
    });
  }

  public createBank(config: BankConfig): Bank {
    const bank: Bank = {
      id: generateId(),
      ...config,
      attackHistory: [],
    };
    this.gameState.addBank(bank);
    return bank;
  }

  public getBank(bankId: string): Bank | undefined {
    return this.gameState.getBank(bankId);
  }

  public getAllBanks(): Bank[] {
    return this.gameState.getAllBanks();
  }

  public updateBank(bank: Bank): void {
    this.gameState.updateBank(bank);
  }

  public onBankRobbed(attack: Attack): void {
    if (attack.outcome !== AttackOutcome.Success) return;

    const bank = this.getBank(attack.bank.id);
    if (!bank) return;

    // Update bank's loot potential, but don't go below minimum
    bank.lootPotential = Math.max(
      bank.minLootPotential,
      bank.lootPotential - (attack.loot?.amount || 0)
    );

    // Increase guards based on successful attackers
    const numSurvivors = attack.winners?.length || 0;
    bank.guardsCurrent = Math.min(
      bank.guardMax,
      bank.guardsCurrent + Math.ceil(numSurvivors / 2)
    );

    // Add to attack history
    bank.attackHistory.push(attack);

    // Update bank state
    this.updateBank(bank);

    // Hook for future extensions (e.g., bank reputation system, security upgrades)
    this.onBankRobbedExtension(bank, attack);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onBankRobbedExtension(bank: Bank, attack: Attack): void {
    // Extension point for derived classes
    // Can be overridden to add custom behavior when a bank is robbed
  }

  public processEndOfDay(): void {
    // Process end of day for each bank
    this.getAllBanks().forEach((bank) => {
      this.processEndOfDayForBank(bank);
    });
  }

  protected processEndOfDayForBank(bank: Bank): void {
    // Regenerate loot potential
    const maxPotential = bank.lootPotential * GAME_CONFIG.MAX_LOOT_MULTIPLIER;
    const lootGap = maxPotential - bank.lootPotential;
    const lootRegeneration = Math.floor(
      lootGap * GAME_CONFIG.LOOT_REGENERATION_RATE
    );
    bank.lootPotential += lootRegeneration;

    // Adjust guard count towards base level
    if (bank.guardsCurrent > bank.guardMin && Math.random() < 0.5) {
      bank.guardsCurrent = Math.max(bank.guardMin, bank.guardsCurrent - 1);
    }

    this.updateBank(bank);
  }
}
