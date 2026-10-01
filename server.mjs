import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";

const dev = process.env.NODE_ENV !== "production";
const hostname = "127.0.0.1";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Ensure shared event hub exists on globalThis
if (!globalThis.matchEventHub) {
  globalThis.matchEventHub = new EventEmitter();
  globalThis.matchEventHub.setMaxListeners(200);
}
const matchEventHub = globalThis.matchEventHub;

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling request:", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // Attach WebSocket server for real-time dual-screen synchronization
  const wss = new WebSocketServer({ noServer: true });

  // Map matchId to Set of WebSockets
  const matchClients = new Map();

  wss.on("connection", (ws, req) => {
    const parsedUrl = parse(req.url, true);
    const matchId = parseInt(parsedUrl.query?.matchId, 10);

    if (!isNaN(matchId)) {
      if (!matchClients.has(matchId)) {
        matchClients.set(matchId, new Set());
      }
      matchClients.get(matchId).add(ws);
    }

    ws.on("close", () => {
      if (!isNaN(matchId) && matchClients.has(matchId)) {
        matchClients.get(matchId).delete(ws);
        if (matchClients.get(matchId).size === 0) {
          matchClients.delete(matchId);
        }
      }
    });

    ws.on("error", () => {
      ws.terminate();
    });
  });

  // Listen to match mutation events from Server Actions / API routes
  matchEventHub.on("match_update", (message) => {
    const matchId = message?.payload?.id;
    if (matchId && matchClients.has(matchId)) {
      const dataStr = JSON.stringify(message);
      for (const client of matchClients.get(matchId)) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(dataStr);
        }
      }
    }
  });

  server.on("upgrade", (req, socket, head) => {
    const parsedUrl = parse(req.url, true);

    if (parsedUrl.pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> BOX Score server ready on http://${hostname}:${port}`);
    console.log(`> Real-time WebSocket engine active on ws://${hostname}:${port}/ws`);
  });
});
