"use client";

import { InformationPiece, InteractionType } from "@/game/types/game.types";
import { MoneyTransferCard } from "./MoneyTransferCard";

interface InformationPieceRendererProps {
  piece: InformationPiece;
  isOwnMessage: boolean;
}

export function InformationPieceRenderer({
  piece,
  isOwnMessage,
}: InformationPieceRendererProps) {
  console.log("piece", piece);
  if (
    piece.type === "interaction" &&
    piece.interactionType === InteractionType.MoneyTransfer
  ) {
    return <MoneyTransferCard transfer={piece} isOwnMessage={isOwnMessage} />;
  }

  // Add more cases for other information piece types here
  return null;
}
