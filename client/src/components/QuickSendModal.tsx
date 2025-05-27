import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MessageCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface QuickSendModalProps {
  open: boolean;
  onClose: () => void;
}

export default function QuickSendModal({ open, onClose }: QuickSendModalProps) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessions } = useQuery({
    queryKey: ["/api/sessions"],
    enabled: open,
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { phone: string; content: string; sessionId: number }) => {
      return await apiRequest("POST", "/api/messages/quick-send", data);
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada!",
        description: "Sua mensagem foi adicionada à fila de envio.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Falha ao enviar mensagem",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim()) {
      toast({
        title: "Número obrigatório",
        description: "Por favor, informe o número do destinatário",
        variant: "destructive",
      });
      return;
    }
    
    if (!message.trim()) {
      toast({
        title: "Mensagem obrigatória",
        description: "Por favor, digite uma mensagem",
        variant: "destructive",
      });
      return;
    }
    
    if (!sessionId) {
      toast({
        title: "Sessão obrigatória",
        description: "Por favor, selecione uma sessão",
        variant: "destructive",
      });
      return;
    }

    sendMutation.mutate({
      phone: phone.trim(),
      content: message.trim(),
      sessionId: parseInt(sessionId),
    });
  };

  const handleClose = () => {
    setPhone("");
    setMessage("");
    setSessionId("");
    onClose();
  };

  const connectedSessions = sessions?.filter((s: any) => s.status === 'connected') || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Envio Rápido
          </DialogTitle>
          <DialogDescription>
            Envie mensagens rapidamente para um ou múltiplos números
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Número(s)</Label>
            <Input
              id="phone"
              type="text"
              placeholder="55119999999 ou múltiplos separados por vírgula"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Digite números no formato 5511999999999 ou separe múltiplos com vírgula
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              rows={4}
              placeholder="Digite sua mensagem aqui..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full resize-none"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="session">Sessão</Label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma sessão" />
              </SelectTrigger>
              <SelectContent>
                {connectedSessions.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhuma sessão conectada
                  </SelectItem>
                ) : (
                  connectedSessions.map((session: any) => (
                    <SelectItem key={session.id} value={session.id.toString()}>
                      {session.name} {session.phone && `(${session.phone})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={sendMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={sendMutation.isPending || connectedSessions.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {sendMutation.isPending ? (
                "Enviando..."
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
