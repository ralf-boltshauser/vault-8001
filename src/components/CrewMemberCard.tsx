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
      className={`relative bg-gray-800 rounded p-2 border ${getBorderColor()} ${
        isSelected ? "ring-1 ring-blue-500" : ""
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1">
          {member.status === CrewMemberStatus.Healthy && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(member.id);
              }}
              className={`p-0.5 rounded ${
                isSelected
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              <span className="material-icons text-xs">
                {isSelected ? "check_box" : "check_box_outline_blank"}
              </span>
            </button>
          )}
          <div>
            <h3 className="text-base font-semibold text-white">
              {member.name}
            </h3>
            <p className="text-xs text-gray-300">
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
                    <span className="ml-1">
                      ({member.jailTerm}{" "}
                      {member.jailTerm === 1 ? "turn" : "turns"})
                    </span>
                  )}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {member.status !== CrewMemberStatus.Arrested && (
            <button
              onClick={() => setShowActions(!showActions)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
            >
              <span className="material-icons text-sm">
                {showActions ? "expand_less" : "expand_more"}
              </span>
              {showActions ? "Hide" : "Actions"}
            </button>
          )}
          <button
            onClick={() => setShowPerks(!showPerks)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
          >
            <span className="material-icons text-sm">
              {showPerks ? "expand_less" : "expand_more"}
            </span>
            {showPerks ? "Hide" : "Perks"}
          </button>
        </div>
      </div>

      {/* Quick perk overview */}
      {!showPerks && member.perks.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {member.perks.map((perk) => (
            <div
              key={perk.type}
              className="flex items-center bg-gray-700 px-1.5 py-0.5 rounded"
            >
              <span className="material-icons text-gray-300 mr-0.5 text-xs">
                {perk.icon}
              </span>
              <span className="text-white text-xs">{perk.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Full perk management */}
      {showPerks && (
        <div className="mt-2 border-t border-gray-700 pt-2">
          <PerkManager member={member} />
        </div>
      )}

      {/* Action management - only show if not arrested */}
      {showActions && member.status !== CrewMemberStatus.Arrested && (
        <div className="mt-2 border-t border-gray-700 pt-2">
          <ActionManager member={member} />
        </div>
      )}
    </div>
  );
}
