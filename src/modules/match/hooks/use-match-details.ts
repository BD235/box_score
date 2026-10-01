"use client";

import { useQuery } from "@tanstack/react-query";
import type { FullMatchData } from "@/db/schema/matches.schema";

export function useMatchDetails(matchId: number) {
  return useQuery<FullMatchData>({
    queryKey: ["match", matchId],
    queryFn: async (): Promise<FullMatchData> => {
      const res = await fetch(`/api/matches/${matchId}`);
      if (!res.ok) throw new Error("Failed to fetch match details");
      const data = await res.json();
      return data.match;
    },
    staleTime: Infinity,
    gcTime: 86_400_000,
  });
}
