import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useWebSocket } from "../contexts/WebSocketContext";
import {
  Action,
  CrewMember,
  CrewMemberStatus,
  GamePhase,
  PerkType,
  TurnReport,
} from "../game/types/game.types";

export function TurnSubmission() {
  const { gameState, playerCrew, submitTurn } = useWebSocket();

  const canSubmitTurn = playerCrew?.crewMembers
    .filter((m) => m.status == CrewMemberStatus.Healthy)
    .every((member) => member.action !== Action.None || member.plannedAction);

  const isReadyForNextPhase = playerCrew?.isReadyForNextPhase;

  if (!gameState || !playerCrew) return null;

  const renderReport = (
    report: TurnReport,
    member: CrewMember | undefined,
    index: number
  ) => (
    <div key={index} className="bg-gray-700 p-3 rounded text-gray-300">
      <div className="flex items-center gap-2">
        <span className="font-medium text-white">{member?.name}</span>
        {member?.perks.some((p) => p.type === PerkType.Phone) && (
          <span className="material-icons text-blue-400 text-sm">
            smartphone
          </span>
        )}
        <span>: </span>
      </div>
      <div className="mt-1">{report.message}</div>
      {report.details.earnings !== undefined && report.details.earnings > 0 && (
        <div className="text-green-400 mt-1">
          Earned: ${report.details.earnings.toLocaleString()}
        </div>
      )}
    </div>
  );

  const reports = playerCrew.turnReports || [];

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Game Status</h2>
        <div className="text-gray-300">
          Turn: <span className="text-white">{gameState.turnNumber}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-gray-300">
            Phase:{" "}
            <span
              className={`font-medium ${
                gameState.phase === GamePhase.Planning
                  ? "text-blue-400"
                  : "text-yellow-400"
              }`}
            >
              {gameState.phase}
            </span>
          </div>
          {gameState.phase === GamePhase.Planning && (
            <button
              onClick={submitTurn}
              disabled={!canSubmitTurn || isReadyForNextPhase}
              className={`px-4 py-2 rounded ${
                !canSubmitTurn || isReadyForNextPhase
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isReadyForNextPhase
                ? "Waiting for Others"
                : canSubmitTurn
                ? "Submit Turn"
                : "Assign All Actions First"}
            </button>
          )}
        </div>

        {gameState.phase === GamePhase.Resolution && (
          <div className="text-yellow-400 animate-pulse">
            Resolving actions...
          </div>
        )}

        {gameState.phase === GamePhase.Planning && reports.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="text-lg font-semibold text-white">
              Last Turn Reports
            </h3>

            {/* First report is always shown */}
            {renderReport(
              reports[0],
              playerCrew.crewMembers.find(
                (m) => m.id === reports[0].crewMemberId
              ),
              0
            )}

            {/* Rest of the reports are collapsible */}
            {reports.length > 1 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 mt-2">
                  <ChevronDown className="h-4 w-4" />
                  Show {reports.length - 1} more reports
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mt-2">
                    {reports.slice(1).map((report, index) => {
                      const member = playerCrew.crewMembers.find(
                        (m) => m.id === report.crewMemberId
                      );
                      return renderReport(report, member, index + 1);
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
