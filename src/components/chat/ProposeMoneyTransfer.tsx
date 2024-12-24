"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { InteractionType } from "@/game/types/game.types";
import { useState } from "react";

interface ProposeMoneyTransferProps {
  recipientId: string;
}

export function ProposeMoneyTransfer({
  recipientId,
}: ProposeMoneyTransferProps) {
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const { sendInteraction, gameState } = useWebSocket();

  const recipientCrew = gameState?.crews.find(
    ([id]) => id === recipientId
  )?.[1];

  const handleTransfer = () => {
    const numericAmount = parseInt(amount, 10);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return;
    }

    sendInteraction(recipientId, InteractionType.MoneyTransfer, {
      amount: numericAmount,
    });

    setAmount("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
          <span className="sr-only">Send money</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Money</DialogTitle>
          <DialogDescription>
            Propose a money transfer to {recipientCrew?.name || "the recipient"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              min="0"
              placeholder="Enter amount..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleTransfer} type="submit">
            Send Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
