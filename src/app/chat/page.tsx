import ChatList from "@/components/chat/ChatList";
import Link from "next/link";

export default function ChatPage() {
  return (
    <div className="container mx-auto">
      {" "}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-100">Chats</h1>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded"
        >
          Back Home
        </Link>
      </div>
      <ChatList />
    </div>
  );
}
