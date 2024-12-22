import { Attack, Bank } from "@/game/types/game.types";
import { useState } from "react";

interface BankCardProps {
  bank: Bank;
}

export function BankCard({ bank }: BankCardProps) {
  const [showHistory, setShowHistory] = useState(false);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderAttackHistory = (attack: Attack) => {
    if (!attack.isPublic) {
      return (
        <div key={attack.id} className="text-gray-300 mb-2">
          <span className="text-gray-400">Turn {attack.turnNumber}:</span>{" "}
          {attack.outcome === "success" && attack.loot
            ? `${formatMoney(attack.loot.amount)} was stolen`
            : "Attempted heist"}
        </div>
      );
    }

    // Full details for public attacks
    return (
      <div key={attack.id} className="text-gray-300 mb-2">
        <span className="text-gray-400">Turn {attack.turnNumber}:</span>{" "}
        {attack.attackingCrews.map((crew) => (
          <span key={crew.crew.id}>
            {crew.crew.name} ({crew.crewMembers.length} members)
            {crew.type === "cooperative" ? " (cooperative)" : ""}
          </span>
        ))}{" "}
        {attack.outcome === "success" && attack.loot
          ? `successfully stole ${formatMoney(attack.loot.amount)}`
          : "failed to rob the bank"}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">{bank.name}</h2>
        <div className="text-gray-300">
          Guards: {bank.guardsCurrent}/{bank.guardMax}
        </div>
      </div>
      <div className="mb-4">
        <div className="text-gray-300">
          Loot Potential: {formatMoney(bank.lootPotential)}
        </div>
      </div>
      <div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-blue-400 hover:text-blue-300 focus:outline-none"
        >
          {showHistory ? "Hide History" : "Show History"}
        </button>
        {showHistory && bank.attackHistory && bank.attackHistory.length > 0 && (
          <div className="mt-4 space-y-2">
            {bank.attackHistory
              .sort((a, b) => b.timestamp - a.timestamp)
              .map(renderAttackHistory)}
          </div>
        )}
      </div>
    </div>
  );
}
