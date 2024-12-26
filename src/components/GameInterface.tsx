import { useState } from "react";
import { useWebSocket } from "../contexts/WebSocketContext";
import { Action, CrewMemberStatus } from "../game/types/game.types";
import { BulkActionManager } from "./BulkActionManager";
import { CrewMemberCard } from "./CrewMemberCard";
import { JoinGame } from "./JoinGame";
import { TurnSubmission } from "./TurnSubmission";

export function GameInterface() {
  const { connected, playerCrew, hireMember } = useWebSocket();
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

  const hasWithoutAction = playerCrew.crewMembers.some(
    (member) =>
      (!member.plannedAction || member.plannedAction.type == Action.None) &&
      member.status === CrewMemberStatus.Healthy
  );

  const selectAllWithoutAction = () => {
    setSelectedMembers(
      playerCrew.crewMembers
        .filter(
          (member) =>
            (!member.plannedAction ||
              member.plannedAction.type == Action.None) &&
            member.status === CrewMemberStatus.Healthy
        )
        .map((member) => member.id)
    );
  };

  // Sort crew members: healthy first, then by number of perks
  const sortedMembers = [...playerCrew.crewMembers].sort((a, b) => {
    // First sort by status (healthy first)
    if (
      a.status === CrewMemberStatus.Healthy &&
      b.status !== CrewMemberStatus.Healthy
    )
      return -1;
    if (
      a.status !== CrewMemberStatus.Healthy &&
      b.status === CrewMemberStatus.Healthy
    )
      return 1;

    // Then sort by number of perks (more perks first)
    return b.perks.length - a.perks.length;
  });

  return (
    <div className="container mx-auto">
      <div className="grid gap-4">
        <TurnSubmission />

        <div className="grid gap-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Your Crew</h2>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-300">
                Capital:{" "}
                <span className="text-white">
                  ${playerCrew.capital.toLocaleString()}
                </span>
              </div>
              {healthyMembers.length > 0 && (
                <div className="flex gap-1.5">
                  <button
                    onClick={selectAllHealthy}
                    className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    Select All Healthy
                  </button>
                  {hasWithoutAction && (
                    <button
                      onClick={selectAllWithoutAction}
                      className="px-2 py-0.5 rounded bg-gray-600 hover:bg-gray-700 text-white text-xs"
                    >
                      Select All Without Action
                    </button>
                  )}
                  {selectedMembers.length > 0 && (
                    <button
                      onClick={clearSelection}
                      className="px-2 py-0.5 rounded bg-gray-600 hover:bg-gray-700 text-white text-xs"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={() => hireMember()}
                className="px-2 py-0.5 rounded bg-green-600 hover:bg-green-700 text-white text-xs"
              >
                Hire Member
              </button>
            </div>
          </div>

          <div
            className={`bg-gray-800 p-3 rounded ${
              selectedMembers.length === 0 ? "opacity-50" : ""
            }`}
          >
            <BulkActionManager
              selectedMembers={selectedMembers}
              onClose={clearSelection}
            />
          </div>

          <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {sortedMembers.map((member) => (
              <CrewMemberCard
                key={member.id}
                member={member}
                isSelected={selectedMembers.includes(member.id)}
                onSelect={toggleMemberSelection}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
