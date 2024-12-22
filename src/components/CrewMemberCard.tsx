import { useState } from "react";
import {
  Action,
  AttackType,
  CrewMember,
  CrewMemberStatus,
} from "../game/types/game.types";
import { ActionManager } from "./ActionManager";
import { PerkManager } from "./PerkManager";

interface CrewMemberCardProps {
  member: CrewMember;
  isSelected: boolean;
  onSelect: (memberId: string) => void;
}

export function CrewMemberCard({
  member,
  isSelected,
  onSelect,
}: CrewMemberCardProps) {
  const [showPerks, setShowPerks] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Don't render card if member is dead
  if (member.status === CrewMemberStatus.Dead) return null;

  // Clear planned action if member is arrested
  if (member.status === CrewMemberStatus.Arrested && member.plannedAction) {
    member.plannedAction = undefined;
    member.action = Action.None;
  }

  // Get border color based on status and planned action
  const getBorderColor = () => {
    if (member.status === CrewMemberStatus.Arrested) return "border-orange-500";
    if (member.plannedAction?.type === Action.None) return "border-gray-700";
    if (member.plannedAction?.type === Action.Work) return "border-green-500";
    if (member.plannedAction?.attackType === AttackType.Cooperative)
      return "border-blue-500";
    if (member.plannedAction?.attackType === AttackType.Hostile)
      return "border-red-500";
    return "border-gray-700";
  };

  return (
    <div
      className={`relative bg-gray-800 rounded-lg p-4 border-2 ${getBorderColor()} ${
        isSelected ? "ring-2 ring-blue-500" : ""
      }`}
      onClick={() => onSelect?.(member.id)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          {member.status === CrewMemberStatus.Healthy && (
            <button
              onClick={() => onSelect(member.id)}
              className={`p-1 rounded ${
                isSelected
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              <span className="material-icons text-sm">
                {isSelected ? "check_box" : "check_box_outline_blank"}
              </span>
            </button>
          )}
          <div>
            <h3 className="text-xl font-bold text-white">{member.name}</h3>
            <p className="text-gray-300">
              Status:{" "}
              <span
                className={`${
                  member.status === CrewMemberStatus.Arrested
                    ? "text-orange-400"
                    : "text-white"
                }`}
              >
                {member.status}
                {member.status === CrewMemberStatus.Arrested &&
                  member.jailTerm !== undefined && (
                    <span className="ml-1 text-sm">
                      ({member.jailTerm}{" "}
                      {member.jailTerm === 1 ? "turn" : "turns"} left)
                    </span>
                  )}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {member.status !== CrewMemberStatus.Arrested && (
            <button
              onClick={() => setShowActions(!showActions)}
              className="text-blue-400 hover:text-blue-300 flex items-center"
            >
              <span className="material-icons mr-1">
                {showActions ? "expand_less" : "expand_more"}
              </span>
              {showActions ? "Hide Actions" : "Manage Actions"}
            </button>
          )}
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

      {/* Action management - only show if not arrested */}
      {showActions && member.status !== CrewMemberStatus.Arrested && (
        <div className="mt-4 border-t border-gray-700 pt-4">
          <ActionManager member={member} />
        </div>
      )}
    </div>
  );
}
