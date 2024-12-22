export const GAME_CONFIG = {
  // Crew Member Management
  CREW_MEMBER_COST: 50000,
  BASE_WORK_SALARY: 5000,
  WORK_SALARY_VARIANCE: 2000, // Random variance in work salary
  BASE_POWER: 10, // Base power for each crew member
  STARTING_CAPITAL: 200000,

  // Perks
  PERK_COSTS: {
    GUN: 25000,
    PHONE: 15000,
  },
  PERK_POWER: {
    GUN: 5,
    PHONE: 3,
  },

  // Bank Related
  BANK_GUARD_POWER: 10, // Power per guard
  SECURITY_FEATURE_POWER: 5, // Power per security feature
  MIN_SUCCESS_RATE: 30, // Minimum success rate for partial success
  HIGH_SUCCESS_RATE: 70, // Rate needed for full success
  LOOT_REGENERATION_RATE: 0.05, // 5% of the gap regenerates per turn
  MAX_LOOT_MULTIPLIER: 2, // Maximum loot is double the initial potential
  MIN_LOOT_PERCENTAGE: 0.6, // Minimum loot is 60% of initial potential

  // Combat Related
  BASE_COMBAT_CHANCE: 0.5, // Base 50/50 chance for equal opponents
  GUN_ADVANTAGE_CHANCE: 0.7, // 70% win chance with gun advantage
  DEATH_VS_GUARDS_CHANCE: 0.3, // 30% chance to die when losing to guards
  JAIL_TERMS: {
    WITH_GUN: 5,
    WITHOUT_GUN: 3,
  },

  // Work Bonuses
  WORK_BONUS_PER_PERK: 1000, // Additional salary per perk
  PHONE_WORK_BONUS: 2000, // Additional bonus for phone perk specifically
  WORK_EXPERIENCE_BONUS: 500, // Bonus per successful work action
  BASIC_INCOME: 10000, // Income for crews with no healthy members

  // Time Related
  REPORT_PHASE_DURATION: 10000, // Duration of report phase in ms
  DISCONNECT_TIMEOUT: 1800000, // 30 minutes in ms

  // Game Balance
  MIN_BANK_GUARDS: 2,
  MAX_BANK_GUARDS: 10,
  WINNING_CAPITAL: 20_000_000,

  // Default Banks
  DEFAULT_BANKS: [
    {
      name: "Small Town Bank",
      guardMin: 2,
      guardMax: 4,
      guardsCurrent: 3,
      difficultyLevel: 1,
      lootPotential: 100000,
      minLootPotential: 60000,
      securityFeatures: ["Basic Alarm", "Cameras"],
    },
    {
      name: "City Central Bank",
      guardMin: 5,
      guardMax: 10,
      guardsCurrent: 7,
      difficultyLevel: 3,
      lootPotential: 400000,
      minLootPotential: 240000,
      securityFeatures: [
        "Advanced Alarm",
        "Armed Guards",
        "Vault Timer",
        "Security Doors",
      ],
    },
    {
      name: "SNB",
      guardMin: 15,
      guardMax: 25,
      guardsCurrent: 15,
      difficultyLevel: 5,
      lootPotential: 10000000,
      minLootPotential: 6000000,
      securityFeatures: [
        "Advanced Alarm",
        "Armed Guards",
        "Vault Timer",
        "Security Doors",
      ],
    },
  ],
} as const;

// Helper function to calculate work salary
export function calculateWorkSalary(perks: string[]): number {
  const baseSalary = GAME_CONFIG.BASE_WORK_SALARY;
  const variance = Math.floor(Math.random() * GAME_CONFIG.WORK_SALARY_VARIANCE);
  const perkBonus = perks.length * GAME_CONFIG.WORK_BONUS_PER_PERK;
  const phoneBonus = perks.includes("phone") ? GAME_CONFIG.PHONE_WORK_BONUS : 0;

  return baseSalary + variance + perkBonus + phoneBonus;
}

// Helper function to calculate attack power
export function calculateAttackPower(perks: string[]): number {
  const basePower = GAME_CONFIG.BASE_POWER;
  const perkPower = perks.reduce((total, perk) => {
    return (
      total +
      (GAME_CONFIG.PERK_POWER[
        perk.toUpperCase() as keyof typeof GAME_CONFIG.PERK_POWER
      ] || 0)
    );
  }, 0);

  return basePower + perkPower;
}

// Helper function to calculate bank defense
export function calculateBankDefense(
  guards: number,
  securityFeatures: number
): number {
  return (
    guards * GAME_CONFIG.BANK_GUARD_POWER +
    securityFeatures * GAME_CONFIG.SECURITY_FEATURE_POWER
  );
}
