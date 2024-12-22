import { useWebSocket } from "@/contexts/WebSocketContext";
import { BankCard } from "./BankCard";

export function BankList() {
  const { gameState, connected } = useWebSocket();
  console.log(gameState, connected);

  if (!gameState) {
    return (
      <div className="text-gray-400 text-center py-8">
        Connecting to game server...
      </div>
    );
  }

  const banks = Array.from(gameState.banks.values()).map(([_, bank]) => bank);

  return (
    <div className="grid gap-6">
      {banks.map((bank) => (
        <BankCard key={bank.id} bank={bank} />
      ))}
    </div>
  );
}
