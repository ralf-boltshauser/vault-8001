export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function calculateSuccess(attackPower: number, defense: number): number {
  return Math.min(Math.max((attackPower / defense) * 100, 0), 100);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
