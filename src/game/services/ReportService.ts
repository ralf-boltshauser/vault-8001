import {
  Attack,
  AttackOutcome,
  CrewMember,
  TurnReport,
} from "../types/game.types";

export class ReportService {
  public generateHeistReports(
    attack: Attack,
    survivors: CrewMember[],
    lootPerMember: number
  ): TurnReport[] {
    const reports: TurnReport[] = [];

    // Only survivors can write reports
    survivors.forEach((survivor) => {
      const report: TurnReport = {
        crewMemberId: survivor.id,
        message: this.generateSurvivorMessage(attack, lootPerMember),
        details: {
          location: attack.bank.name,
          earnings: lootPerMember,
          outcome: attack.outcome,
        },
      };

      reports.push(report);
    });

    return reports;
  }

  private generateSurvivorMessage(
    attack: Attack,
    lootPerMember: number
  ): string {
    if (attack.outcome === AttackOutcome.Success) {
      return `Successfully robbed ${
        attack.bank.name
      } and brought home $${lootPerMember.toLocaleString()}.`;
    }
    return `Failed to rob ${attack.bank.name}.`;
  }
}
