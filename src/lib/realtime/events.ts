import { EventEmitter } from "events";

class MatchEventHub extends EventEmitter {}

const globalEventHub = globalThis as unknown as {
  matchEventHub: MatchEventHub | undefined;
};

if (!globalEventHub.matchEventHub) {
  globalEventHub.matchEventHub = new MatchEventHub();
  globalEventHub.matchEventHub.setMaxListeners(200);
}

export const matchEventHub = globalEventHub.matchEventHub;

export interface RealtimeMessage {
  topic: string;
  event: "UPDATE" | "INSERT" | "DELETE";
  payload: any;
}

export function broadcastMatchUpdate(gameData: { id: number; [key: string]: any }) {
  const message: RealtimeMessage = {
    topic: `realtime:public:matches:id=eq.${gameData.id}`,
    event: "UPDATE",
    payload: gameData,
  };
  matchEventHub.emit("match_update", message);
}
