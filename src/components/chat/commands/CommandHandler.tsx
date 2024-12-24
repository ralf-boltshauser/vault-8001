"use client";

import { useWebSocket } from "@/contexts/WebSocketContext";
import { CommandService, CommandType } from "@/game/services/CommandService";
import { InteractionType } from "@/game/types/game.types";

interface CommandHandlerProps {
  content: string;
  threadId: string;
  onCommandProcessed: () => void;
  onError: (error: string) => void;
}

export function useCommandHandler() {
  const { playerCrew, gameState, sendInteraction } = useWebSocket();
  const commandService = CommandService.getInstance();

  const handleCommand = (props: CommandHandlerProps) => {
    const { content, threadId, onCommandProcessed, onError } = props;

    if (!playerCrew || !gameState) {
      onError("Game state not initialized");
      return false;
    }

    const command = commandService.parseCommand(content);
    if (!command) {
      return false;
    }

    const thread = gameState.chatThreads.find(([id]) => id === threadId)?.[1];
    if (!thread) {
      onError("Thread not found");
      return false;
    }

    const recipientId = commandService.getOtherParticipant(
      thread.participants,
      playerCrew.id
    );
    if (!recipientId) {
      onError("No recipient found");
      return false;
    }

    try {
      switch (command.type) {
        case CommandType.SendMoney:
          if (!command.params.amount) {
            onError("Invalid amount");
            return false;
          }
          sendInteraction(recipientId, InteractionType.MoneyTransfer, {
            amount: command.params.amount,
          });
          break;
        // Add more command handlers here
        default:
          onError("Unknown command");
          return false;
      }

      onCommandProcessed();
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unknown error");
      return false;
    }
  };

  return handleCommand;
}
