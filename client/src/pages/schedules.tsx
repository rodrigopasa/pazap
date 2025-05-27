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
  const [recipientType, setRecipientType] = useState<"phone" | "group">("phone");
  const [phone, setPhone] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
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
  })

  // Buscar grupos da sessão selecionada
  const { data: groups = [] } = useQuery({
    queryKey: ["/api/groups", selectedSession],
    enabled: !!selectedSession && recipientType === "group",
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
    setRecipientType("phone");
    setPhone("");
    setSelectedGroup("");
    setContent("");
    setScheduledDate("");
    setScheduledTime("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const recipient = recipientType === "phone" ? phone : selectedGroup;
    
    if (!selectedSession || !recipient || !content || !scheduledDate || !scheduledTime) {
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
      recipientType,
      phone: recipientType === "phone" ? phone : undefined,
      groupId: recipientType === "group" ? selectedGroup : undefined,
      content,
      scheduledDate,
      scheduledTime
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
    <div className="space-y-8 p-6">
      {/* Header Section with improved spacing and design */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agendamentos</h1>
              <p className="text-blue-600 dark:text-blue-400 font-medium">
                Gerencie suas mensagens agendadas para grupos e contatos
              </p>
            </div>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-6 text-base font-medium">
              <Plus className="mr-2 h-5 w-5" />
              Nova Mensagem Agendada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

              {/* Tipo de Destinatário */}
              <div className="space-y-3">
                <Label>Tipo de Destinatário</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="phone-option"
                      value="phone"
                      checked={recipientType === "phone"}
                      onChange={(e) => setRecipientType(e.target.value as "phone" | "group")}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <Label htmlFor="phone-option" className="text-sm font-medium">
                      📱 Número Individual
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="group-option"
                      value="group"
                      checked={recipientType === "group"}
                      onChange={(e) => setRecipientType(e.target.value as "phone" | "group")}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <Label htmlFor="group-option" className="text-sm font-medium">
                      👥 Grupo
                    </Label>
                  </div>
                </div>
              </div>

              {/* Campo Destinatário */}
              {recipientType === "phone" ? (
                <div className="space-y-2">
                  <Label htmlFor="phone">Número do WhatsApp</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Ex: 5511999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-base"
                  />
                  <p className="text-xs text-gray-500">
                    Inclua o código do país (ex: 55 para Brasil)
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="group">Grupo do WhatsApp</Label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Selecione um grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group: any) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          👥 {group.name} ({group.memberCount} membros)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSession && groups.length === 0 && (
                    <p className="text-xs text-amber-600">
                      Nenhum grupo encontrado para esta sessão
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="content">Mensagem</Label>
                <div className="space-y-2">
                  <Textarea
                    id="content"
                    placeholder="Digite sua mensagem... (Você pode incluir links como https://exemplo.com)"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                  />
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      ✓ Links são automaticamente detectados • Use *negrito* e _itálico_
                    </div>
                    <span className="text-xs text-gray-400">
                      {content.length}/2000
                    </span>
                  </div>
                  {/* Preview de Links */}
                  {content && content.match(/(https?:\/\/[^\s]+)/g) && (
                    <div className="bg-blue-50 p-2 rounded border-l-4 border-blue-200">
                      <p className="text-xs font-medium text-blue-800">Links detectados:</p>
                      <div className="space-y-1 mt-1">
                        {content.match(/(https?:\/\/[^\s]+)/g)?.map((link, index) => (
                          <div key={index} className="text-xs text-blue-600 break-all">
                            📎 {link}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium">📅 Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="text-base h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-sm font-medium">🕐 Hora</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="text-base h-11"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1 h-12 text-base font-medium bg-green-600 hover:bg-green-700 text-white"
                  disabled={createScheduledMessage.isPending}
                >
                  {createScheduledMessage.isPending ? (
                    <>⏳ Agendando...</>
                  ) : (
                    <>📅 Agendar Mensagem</>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="h-12 px-6 text-base"
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