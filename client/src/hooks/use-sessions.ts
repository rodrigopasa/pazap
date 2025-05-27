import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useSessions() {
  const { toast } = useToast();

  const {
    data: sessions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/sessions"],
    queryFn: api.sessions.getAll,
  });

  const createSessionMutation = useMutation({
    mutationFn: api.sessions.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Sucesso",
        description: "Sessão criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar sessão",
        variant: "destructive",
      });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: api.sessions.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Sucesso",
        description: "Sessão excluída com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir sessão",
        variant: "destructive",
      });
    },
  });

  const connectSessionMutation = useMutation({
    mutationFn: api.sessions.connect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Sucesso",
        description: "Conectando sessão...",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao conectar sessão",
        variant: "destructive",
      });
    },
  });

  const getQRCodeMutation = useMutation({
    mutationFn: api.sessions.getQR,
  });

  const activeSessions = sessions?.filter((s: any) => s.isActive) || [];
  const totalSessions = sessions?.length || 0;

  return {
    sessions,
    activeSessions,
    totalSessions,
    isLoading,
    error,
    createSession: createSessionMutation.mutate,
    deleteSession: deleteSessionMutation.mutate,
    connectSession: connectSessionMutation.mutate,
    getQRCode: getQRCodeMutation.mutateAsync,
    isCreating: createSessionMutation.isPending,
    isDeleting: deleteSessionMutation.isPending,
    isConnecting: connectSessionMutation.isPending,
    isGettingQR: getQRCodeMutation.isPending,
  };
}
