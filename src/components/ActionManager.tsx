import { useState } from "react";
import { useWebSocket } from "../contexts/WebSocketContext";
import {
  Action,
  CrewMember,
  GamePhase,
  PlannedAction,
} from "../game/types/game.types";

interface ActionManagerProps {
  member: CrewMember;
}

export function ActionManager({ member }: ActionManagerProps) {
  const { gameState, playerCrew, assignAction } = useWebSocket();
  const [selectedAction, setSelectedAction] = useState<Action>(member.action);
  const [selectedBankId, setSelectedBankId] = useState<string>("");

  const banks = gameState?.banks || [];

  const handleAssignAction = () => {
    const plannedAction: PlannedAction = {
      type: selectedAction,
      targetId: selectedAction === Action.Attack ? selectedBankId : undefined,
    };
    assignAction(member.id, plannedAction);
  };

  if (gameState?.phase !== GamePhase.Planning) {
    return (
      <div className="text-gray-400 italic">
        {gameState?.phase === GamePhase.Resolution
          ? "Actions are being resolved..."
          : gameState?.phase === GamePhase.Report
          ? "Reading reports..."
          : "Waiting for next phase..."}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-4">
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value as Action)}
          className="bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={Action.None}>Select Action</option>
          <option value={Action.Attack}>Attack Bank</option>
          <option value={Action.Work}>Work (Earn Money)</option>
        </select>

        {selectedAction === Action.Attack && (
          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Bank</option>
            {banks.map(([id, bank]) => (
              <option key={id} value={id}>
                {bank.name} (${bank.lootPotential.toLocaleString()} potential)
              </option>
            ))}
          </select>
        )}

        <button
          onClick={handleAssignAction}
          disabled={
            selectedAction === Action.None ||
            (selectedAction === Action.Attack && !selectedBankId)
          }
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Assign Action
        </button>
      </div>

      {member.plannedAction && (
        <div className="text-gray-300">
          Planned Action:{" "}
          <span className="text-white">
            {member.plannedAction.type}
            {member.plannedAction.targetId && (
              <>
                {" "}
                -{" "}
                {
                  banks.find(
                    ([id]) => id === member.plannedAction?.targetId
                  )?.[1].name
                }
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
