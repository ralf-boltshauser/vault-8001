import {
  Attack,
  AttackType,
  CrewMember,
  PerkType,
  TurnReport,
} from "../types/game.types";

export class ReportService {
  public generateMemberReport(
    attack: Attack,
    crewMember: CrewMember,
    lootPerMember: number
  ): TurnReport {
    const hasPhone = crewMember.perks.some((p) => p.type === PerkType.Phone);
    return this.generateReport(attack, crewMember, lootPerMember, hasPhone);
  }

  private generateReport(
    attack: Attack,
    crewMember: CrewMember,
    lootPerMember: number,
    phoneReport?: boolean
  ): TurnReport {
    return {
      crewMemberId: crewMember.id,
      message:
        this.generateHeistDetails(attack) +
        ` ${
          lootPerMember === 0
            ? "came home empty"
            : `and brought home $${lootPerMember.toLocaleString()}`
        }.` +
        (phoneReport ? ` It was great serving you!` : ""),
      details: {
        location: attack.bank.name,
        outcome: attack.outcome,
      },
    };
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

    if (attack.winners) {
      parts.push(`There were ${attack.winners.length} heist survivors`);
    }

    return parts.join(". ");
  }
}
