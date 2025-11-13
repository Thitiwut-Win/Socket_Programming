// lib/socket.ts
import { io } from "socket.io-client";

// Create and export one shared socket instance
export const socket = io("http://localhost:5432", {
  transports: ["websocket"],  // force WebSocket transport (for FastAPI)
});
