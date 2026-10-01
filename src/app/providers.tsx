"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            queryFn: async ({ queryKey }) => {
              const [type, id] = queryKey;
              if (type === "match") {
                const res = await fetch(`/api/matches/${id}`);
                if (!res.ok) throw new Error("Failed to fetch match");
                const data = await res.json();
                return data.match;
              }
              throw new Error(`Unhandled queryKey: ${String(type)}`);
            },
            staleTime: Infinity,
            gcTime: 86_400_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
