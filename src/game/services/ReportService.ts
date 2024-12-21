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

    // Generate reports for survivors
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

  public generateHostileReports(attack: Attack): TurnReport[] {
    const reports: TurnReport[] = [];

    const hostileCrews = attack.attackingCrews.filter(
      (ac) => ac.type === AttackType.Hostile
    );

    if (hostileCrews.length > 0) {
      hostileCrews.forEach((hostileCrew) => {
        hostileCrew.crewMembers.forEach((member) => {
          const report: TurnReport = {
            crewMemberId: member.id,
            message: this.generateHostileMessage(attack),
            details: {
              location: attack.bank.name,
              outcome: attack.outcome,
            },
          };
          reports.push(report);
        });
      });
    }

    return reports;
  }

  private generateHostileMessage(attack: Attack): string {
    const coopCrewDetails = attack.attackingCrews
      .filter((ac) => ac.type === AttackType.Cooperative)
      .map(
        (ac) => `${ac.crew.name} (${ac.crewMembers.length} cooperative members)`
      )
      .join(", ");

    const hostileCrewDetails = attack.attackingCrews
      .filter((ac) => ac.type === AttackType.Hostile)
      .map((ac) => `${ac.crew.name} (${ac.crewMembers.length} hostile members)`)
      .join(", ");

    return `Arrived at ${
      attack.bank.name
    } with ${hostileCrewDetails} but found no survivors from the heist crew${
      coopCrewDetails ? ` ${coopCrewDetails}` : ""
    } to fight.`;
  }

  public generatePhoneReport(
    attack: Attack,
    casualty: CrewMember,
    lastWords: string
  ): TurnReport {
    return {
      crewMemberId: casualty.id,
      message: `${this.generateHeistDetails(attack)}. ${lastWords}`,
      details: {
        location: attack.bank.name,
        outcome: attack.outcome,
        lastWords,
      },
    };
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
