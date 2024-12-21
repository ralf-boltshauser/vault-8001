import {
  Attack,
  AttackOutcome,
  AttackType,
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
      const heistDetails = this.generateHeistDetails(attack);
      return `Successfully robbed ${
        attack.bank.name
      } and brought home $${lootPerMember.toLocaleString()}. ${heistDetails}`;
    }
    return `Failed to rob ${attack.bank.name}.`;
  }

  private generateHeistDetails(attack: Attack): string {
    const coopCrews = attack.attackingCrews.filter(
      (ac) => ac.type === AttackType.Cooperative
    );
    const hostileCrews = attack.attackingCrews.filter(
      (ac) => ac.type === AttackType.Hostile
    );

    const parts: string[] = [];

    if (coopCrews.length > 0) {
      const coopDetails = coopCrews
        .map(
          (ac) =>
            `${ac.crew.name} with ${ac.crewMembers.length} crew member${
              ac.crewMembers.length > 1 ? "s" : ""
            }`
        )
        .join(", ");
      parts.push(`Cooperative crews: ${coopDetails}`);
    }

    if (hostileCrews.length > 0) {
      const hostileDetails = hostileCrews
        .map(
          (ac) =>
            `${ac.crew.name} with ${ac.crewMembers.length} crew member${
              ac.crewMembers.length > 1 ? "s" : ""
            }`
        )
        .join(", ");
      parts.push(`Hostile crews: ${hostileDetails}`);
    }

    return parts.join(". ");
  }
}
