"use client";

import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { FullMatchData } from "@/db/schema/matches.schema";

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

interface UseMatchRealtimeOptions {
  onAudioTrigger?: (effect: "VICTORY" | "MINUS_PENALTY" | "ROUND_BELL") => void;
}

export function useMatchRealtime(matchId: number, options?: UseMatchRealtimeOptions) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>("reconnecting");
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const unmountedRef = useRef(false);
  const onAudioRef = useRef(options?.onAudioTrigger);

  useEffect(() => {
    onAudioRef.current = options?.onAudioTrigger;
  }, [options?.onAudioTrigger]);

  useEffect(() => {
    unmountedRef.current = false;

    function connect() {
      if (unmountedRef.current) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws?matchId=${matchId}`;

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (unmountedRef.current) return;
        setStatus("connected");
        reconnectAttemptRef.current = 0;
        
        // Fast Recovery Reconciliation
        queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      };

      socket.onmessage = (event) => {
        if (unmountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.event === "UPDATE" && data.payload) {
            queryClient.setQueryData(["match", matchId], (old: FullMatchData | undefined) => {
              if (!old) return data.payload;
              return { ...old, ...data.payload };
            });

            if (data.payload.lastAudioEffect && onAudioRef.current) {
              onAudioRef.current(data.payload.lastAudioEffect);
            }
          }
        } catch {
          // Ignore invalid JSON payloads
        }
      };

      socket.onclose = () => {
        if (unmountedRef.current) return;
        setStatus("reconnecting");
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    function scheduleReconnect() {
      if (unmountedRef.current) return;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 15000);
      reconnectAttemptRef.current += 1;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [matchId, queryClient]);

  return { status };
}
