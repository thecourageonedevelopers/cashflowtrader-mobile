import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep unused cache for 10 minutes before garbage collecting
      gcTime: 10 * 60 * 1000,
      // Retry failed requests twice before surfacing the error
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      // React Native uses AppState, not window focus — disable web-centric refetch
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
