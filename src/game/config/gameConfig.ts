export const GAME_CONFIG = {
  // Crew Member Management
  CREW_MEMBER_COST: 50000,
  BASE_WORK_SALARY: 5000,
  WORK_SALARY_VARIANCE: 2000, // Random variance in work salary
  BASE_POWER: 10, // Base power for each crew member

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

  // Work Bonuses
  WORK_BONUS_PER_PERK: 1000, // Additional salary per perk
  PHONE_WORK_BONUS: 2000, // Additional bonus for phone perk specifically
  WORK_EXPERIENCE_BONUS: 500, // Bonus per successful work action

  // Time Related
  REPORT_PHASE_DURATION: 10000, // Duration of report phase in ms

  // Game Balance
  STARTING_CAPITAL: 100000,
  MIN_BANK_GUARDS: 2,
  MAX_BANK_GUARDS: 10,
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
