"use client";

import { BankList } from "@/components/public/BankList";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useEffect } from "react";

export default function PublicPage() {
  const { connected, connect } = useWebSocket();
  useEffect(() => {
    if (!connected) {
      connect();
    }
  }, [connected, connect]);
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Bank Status</h1>
      <BankList />
    </div>
  );
}
