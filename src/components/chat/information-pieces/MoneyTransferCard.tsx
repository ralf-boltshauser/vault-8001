"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { InteractionType, MoneyTransferPiece } from "@/game/types/game.types";

interface MoneyTransferCardProps {
  transfer: MoneyTransferPiece;
  isOwnMessage: boolean;
}

export function MoneyTransferCard({
  transfer,
  isOwnMessage,
}: MoneyTransferCardProps) {
  const { gameState, sendInteraction } = useWebSocket();

  const senderCrew = gameState?.crews.find(
    ([id]) => id === transfer.senderId
  )?.[1];
  const recipientCrew = gameState?.crews.find(
    ([id]) => id === transfer.recipientId
  )?.[1];

  const handleAccept = () => {
    sendInteraction(transfer.senderId, InteractionType.AcceptMoneyTransfer, {
      transferId: transfer.id,
    });
  };

  const handleReject = () => {
    sendInteraction(transfer.senderId, InteractionType.RejectMoneyTransfer, {
      transferId: transfer.id,
    });
  };

  return (
    <div
      className={`mb-4 flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
    >
      <Card
        className={`w-[350px] ${
          isOwnMessage ? "bg-blue-600/10" : "bg-gray-800/50"
        }`}
      >
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Money Transfer Proposal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">From:</span>
              <span>{senderCrew?.name || "Unknown"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">To:</span>
              <span>{recipientCrew?.name || "Unknown"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Amount:</span>
              <span className="font-semibold">
                ${transfer.amount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Status:</span>
              <span className="capitalize">{transfer.status}</span>
            </div>
          </div>
        </CardContent>
        {!isOwnMessage && transfer.status === "pending" && (
          <CardFooter className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleReject}>
              Reject
            </Button>
            <Button size="sm" onClick={handleAccept}>
              Accept
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
