import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useStats() {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.stats.get,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}
