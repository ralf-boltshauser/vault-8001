import { Crew } from "@/game/types/game.types";
import { useEffect, useState } from "react";

interface CrewRankingProps {
  crews: Crew[];
}

const WINNING_AMOUNT = 20_000_000;

export function CrewRanking({ crews }: CrewRankingProps) {
  const [winner, setWinner] = useState<Crew | null>(null);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    const potentialWinner = crews.find(
      (crew) => crew.capital >= WINNING_AMOUNT
    );
    if (potentialWinner) {
      setWinner(potentialWinner);
    }
  }, [crews]);

  // If there's no winner, don't show anything
  if (!winner) return null;

  // Sort crews by capital in descending order
  const sortedCrews = [...crews].sort((a, b) => b.capital - a.capital);

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-8">
      <h2 className="text-2xl font-bold text-white mb-6">Game Over!</h2>

      <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-6">
        <h3 className="text-xl font-bold text-yellow-400 mb-2">
          🏆 Winner: {winner.name}
        </h3>
        <p className="text-white">
          Victory achieved with {formatMoney(winner.capital)}!
        </p>
      </div>

      <h3 className="text-xl font-bold text-white mb-4">Final Rankings</h3>
      <div className="space-y-4">
        {sortedCrews.map((crew, index) => (
          <div
            key={crew.id}
            className={`flex justify-between items-center p-4 rounded-lg ${
              winner.id === crew.id
                ? "bg-yellow-500/10 border border-yellow-500"
                : "bg-gray-700"
            }`}
          >
            <div className="flex items-center">
              <span className="text-gray-400 mr-4">#{index + 1}</span>
              <span className="text-white font-medium">{crew.name}</span>
              <span className="text-gray-400 ml-4">
                ({crew.crewMembers.length} members)
              </span>
            </div>
            <div className="text-right">
              <div
                className={`font-medium ${
                  winner.id === crew.id ? "text-yellow-400" : "text-green-400"
                }`}
              >
                {formatMoney(crew.capital)}
              </div>
              <div className="text-sm text-gray-400">
                Final Score:{" "}
                {((crew.capital / WINNING_AMOUNT) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
