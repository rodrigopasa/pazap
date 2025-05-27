import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MessageCircle, Plus, Trash2, Smile, Bold, Italic, Type } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ScheduledMessage {
  id: number;
  sessionId: number;
  sessionName: string;
  content: string;
  phone: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
}

interface Session {
  id: number;
  name: string;
  status: string;
  phone?: string;
}

export default function Schedules() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [content, setContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const { toast } = useToast();

  // Buscar sessões ativas
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  // Buscar mensagens agendadas
  const { data: scheduledMessages = [], isLoading } = useQuery<ScheduledMessage[]>({
    queryKey: ["/api/messages/scheduled"],
  });

  // Mutation para criar mensagem agendada
  const createScheduledMessage = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/messages/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Erro ao agendar mensagem");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/scheduled"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Mensagem agendada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao agendar mensagem",
        variant: "destructive",
      });
    },
  });

  // Mutation para cancelar mensagem agendada
  const cancelScheduledMessage = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/messages/scheduled/${messageId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Erro ao cancelar mensagem");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/scheduled"] });
      toast({
        title: "Sucesso",
        description: "Mensagem cancelada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar mensagem",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedSession("");
    setPhone("");
    setContent("");
    setScheduledDate("");
    setScheduledTime("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSession || !phone || !content || !scheduledDate || !scheduledTime) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    
    if (scheduledAt <= new Date()) {
      toast({
        title: "Erro",
        description: "A data e hora devem ser no futuro",
        variant: "destructive",
      });
      return;
    }

    createScheduledMessage.mutate({
      sessionId: parseInt(selectedSession),
      phone: phone,
      content: content,
      scheduledAt: scheduledAt.toISOString(),
      type: "text",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "outline" as const },
      sent: { label: "Enviada", variant: "default" as const },
      failed: { label: "Falhou", variant: "destructive" as const },
      cancelled: { label: "Cancelada", variant: "secondary" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground">
            Gerencie suas mensagens agendadas
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Mensagem Agendada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agendar Mensagem</DialogTitle>
              <DialogDescription>
                Configure quando e para quem enviar sua mensagem
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session">Sessão</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma sessão" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions
                      .filter((session) => session.status === "connected")
                      .map((session) => (
                        <SelectItem key={session.id} value={session.id.toString()}>
                          {session.name} {session.phone && `(${session.phone})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Número do WhatsApp</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Ex: 5511999999999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Mensagem</Label>
                <Textarea
                  id="content"
                  placeholder="Digite sua mensagem..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Hora</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createScheduledMessage.isPending}
                >
                  {createScheduledMessage.isPending ? "Agendando..." : "Agendar"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Carregando agendamentos...
              </p>
            </CardContent>
          </Card>
        ) : scheduledMessages.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhuma mensagem agendada
                </p>
                <p className="text-sm text-muted-foreground">
                  Clique em "Nova Mensagem Agendada" para começar
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          scheduledMessages.map((message) => (
            <Card key={message.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <CardTitle className="text-base">
                      {message.sessionName}
                    </CardTitle>
                    {getStatusBadge(message.status)}
                  </div>
                  {message.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelScheduledMessage.mutate(message.id)}
                      disabled={cancelScheduledMessage.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Para: {message.phone}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {message.content}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(message.scheduledAt), "dd/MM/yyyy")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(message.scheduledAt), "HH:mm")}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}