import { useState } from "react";
import { CrewMember, CrewMemberStatus } from "../game/types/game.types";
import { ActionManager } from "./ActionManager";
import { PerkManager } from "./PerkManager";

interface CrewMemberCardProps {
  member: CrewMember;
}

export function CrewMemberCard({ member }: CrewMemberCardProps) {
  const [showPerks, setShowPerks] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Don't render card if member is dead
  if (member.status === CrewMemberStatus.Dead) return null;

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{member.name}</h3>
          <p className="text-gray-300">
            Status: <span className="text-white">{member.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowActions(!showActions)}
            className="text-blue-400 hover:text-blue-300 flex items-center"
          >
            <span className="material-icons mr-1">
              {showActions ? "expand_less" : "expand_more"}
            </span>
            {showActions ? "Hide Actions" : "Manage Actions"}
          </button>
          <button
            onClick={() => setShowPerks(!showPerks)}
            className="text-blue-400 hover:text-blue-300 flex items-center"
          >
            <span className="material-icons mr-1">
              {showPerks ? "expand_less" : "expand_more"}
            </span>
            {showPerks ? "Hide Perks" : "Manage Perks"}
          </button>
        </div>
      </div>

      {/* Quick perk overview */}
      {!showPerks && member.perks.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {member.perks.map((perk) => (
            <div
              key={perk.type}
              className="flex items-center bg-gray-700 px-2 py-1 rounded"
            >
              <span className="material-icons text-gray-300 mr-1 text-sm">
                {perk.icon}
              </span>
              <span className="text-white text-sm">{perk.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Full perk management */}
      {showPerks && (
        <div className="mt-4 border-t border-gray-700 pt-4">
          <PerkManager member={member} />
        </div>
      )}

      {/* Action management */}
      {showActions && (
        <div className="mt-4 border-t border-gray-700 pt-4">
          <ActionManager member={member} />
        </div>
      )}
    </div>
  );
}
