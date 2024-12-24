import { Toaster } from "@/components/ui/sonner";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Heist Game",
  description: "A multiplayer heist game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className + " m-5 dark"}>
        <WebSocketProvider>{children}</WebSocketProvider>
        <Toaster />
      </body>
    </html>
  );
}
