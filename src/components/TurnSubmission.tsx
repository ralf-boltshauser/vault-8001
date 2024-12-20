import { useWebSocket } from "../contexts/WebSocketContext";
import { Action, GamePhase } from "../game/types/game.types";

export function TurnSubmission() {
  const { gameState, playerCrew, submitTurn } = useWebSocket();

  const canSubmitTurn = playerCrew?.crewMembers.every(
    (member) => member.action !== Action.None || member.plannedAction
  );

  const isReadyForNextPhase = playerCrew?.isReadyForNextPhase;

  if (!gameState || !playerCrew) return null;

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
                  : gameState.phase === GamePhase.Resolution
                  ? "text-yellow-400"
                  : "text-green-400"
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

        {gameState.phase === GamePhase.Report && playerCrew.turnReports && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Turn Reports</h3>
            {playerCrew.turnReports.map((report, index) => {
              const member = playerCrew.crewMembers.find(
                (m) => m.id === report.crewMemberId
              );
              return (
                <div
                  key={index}
                  className="bg-gray-700 p-3 rounded text-gray-300"
                >
                  <span className="font-medium text-white">
                    {member?.name}:{" "}
                  </span>
                  {report.message}
                  {report.details.earnings > 0 && (
                    <div className="text-green-400 mt-1">
                      Earned: ${report.details.earnings.toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
