import { useState } from "react";
import { useWebSocket } from "../contexts/WebSocketContext";
import { CrewMemberStatus } from "../game/types/game.types";
import { BulkActionManager } from "./BulkActionManager";
import { CrewMemberCard } from "./CrewMemberCard";
import { HireMemberForm } from "./HireMemberForm";
import { JoinGame } from "./JoinGame";
import { TurnSubmission } from "./TurnSubmission";

export function GameInterface() {
  const { connected, playerCrew } = useWebSocket();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  if (!connected) {
    return <JoinGame />;
  }

  if (!playerCrew) return null;

  const healthyMembers = playerCrew.crewMembers.filter(
    (member) => member.status === CrewMemberStatus.Healthy
  );

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const clearSelection = () => {
    setSelectedMembers([]);
  };

  const selectAllHealthy = () => {
    setSelectedMembers(healthyMembers.map((member) => member.id));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-6">
        <TurnSubmission />

        <div className="grid gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Your Crew</h2>
            <div className="flex items-center gap-4">
              <div className="text-gray-300">
                Capital:{" "}
                <span className="text-white">
                  ${playerCrew.capital.toLocaleString()}
                </span>
              </div>
              {healthyMembers.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={selectAllHealthy}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    Select All Healthy
                  </button>
                  {selectedMembers.length > 0 && (
                    <button
                      onClick={clearSelection}
                      className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white text-sm"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedMembers.length > 0 && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <BulkActionManager
                selectedMembers={selectedMembers}
                onClose={clearSelection}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {playerCrew.crewMembers.map((member) => (
              <CrewMemberCard
                key={member.id}
                member={member}
                isSelected={selectedMembers.includes(member.id)}
                onSelect={toggleMemberSelection}
              />
            ))}
          </div>

          <HireMemberForm />
        </div>
      </div>
    </div>
  );
}
