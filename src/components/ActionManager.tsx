import { useWebSocket } from "../contexts/WebSocketContext";
import {
  Action,
  AttackType,
  Bank,
  CrewMember,
  GamePhase,
} from "../game/types/game.types";

interface ActionManagerProps {
  member: CrewMember;
}

interface BankWithId extends Bank {
  id: string;
}

export function ActionManager({ member }: ActionManagerProps) {
  const { gameState, assignAction } = useWebSocket();

  if (gameState?.phase !== GamePhase.Planning) {
    return null;
  }

  // Convert Map entries to Bank array with IDs
  const banks: BankWithId[] = gameState
    ? // eslint-disable-next-line
      Array.from(gameState.banks.values()).map(([_, bank]) => bank)
    : [];

  const handleActionChange = (action: Action) => {
    if (action === Action.Work) {
      assignAction(member.id, {
        type: Action.Work,
        attackType: AttackType.Hostile, // Default, not used for work
      });
    } else if (action === Action.None) {
      assignAction(member.id, {
        type: Action.None,
        attackType: AttackType.Hostile, // Default, not used for none
      });
    }
  };

  const handleAttackSelect = (bankId: string, attackType: AttackType) => {
    assignAction(member.id, {
      type: Action.Attack,
      targetId: bankId,
      attackType: attackType,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <button
          onClick={() => handleActionChange(Action.Work)}
          className={`px-2 py-0.5 rounded text-xs ${
            member.plannedAction?.type === Action.Work
              ? "bg-green-600 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-gray-300"
          }`}
        >
          Work
        </button>
        <button
          onClick={() => handleActionChange(Action.None)}
          className={`px-2 py-0.5 rounded text-xs ${
            !member.plannedAction || member.plannedAction.type === Action.None
              ? "bg-gray-600 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-gray-300"
          }`}
        >
          None
        </button>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-medium text-gray-400">Banks:</h4>
        {banks.map((bank) => {
          const isAttackingThisBank =
            member.plannedAction?.type === Action.Attack &&
            member.plannedAction.targetId === bank.id;

          const isCooperative =
            isAttackingThisBank &&
            member.plannedAction?.attackType === AttackType.Cooperative;

          const isHostile =
            isAttackingThisBank &&
            member.plannedAction?.attackType === AttackType.Hostile;

          return (
            <div
              key={`bank-${bank.id}`}
              className="flex items-center gap-1 text-xs"
            >
              <div className="flex-1">
                <div className="text-white">{bank.name}</div>
                <div className="text-gray-400">
                  Guards: {bank.guardMin || 0}-{bank.guardMax || 0} | $
                  {(bank.lootPotential || 0).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    handleAttackSelect(bank.id, AttackType.Cooperative)
                  }
                  className={`px-2 py-0.5 rounded text-xs ${
                    isCooperative
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }`}
                  title="Work together with other crews"
                >
                  Co-op
                </button>
                <button
                  onClick={() =>
                    handleAttackSelect(bank.id, AttackType.Hostile)
                  }
                  className={`px-2 py-0.5 rounded text-xs ${
                    isHostile
                      ? "bg-red-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }`}
                  title="Fight other crews for the loot"
                >
                  Hostile
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
