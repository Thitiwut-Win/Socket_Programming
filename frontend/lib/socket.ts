// lib/socket.ts
import { io } from "socket.io-client";

// Create and export one shared socket instance
export const socket = io(`${process.env.NEXT_PUBLIC_API_URL}`, {
  transports: ["websocket"], // force WebSocket transport (for FastAPI)
});
