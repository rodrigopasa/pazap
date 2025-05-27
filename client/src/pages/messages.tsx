import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { messageAPI, contactAPI } from "@/lib/api";
import {
  Send,
  Upload,
  Calendar,
  Filter,
  MessageSquare,
  Image,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Phone
} from "lucide-react";

export default function Messages() {
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filterSession, setFilterSession] = useState("");
  
  // Form state
  const [phones, setPhones] = useState("");
  const [content, setContent] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [messageType, setMessageType] = useState("text");
  const [scheduledAt, setScheduledAt] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/messages", filterSession],
    queryFn: () => messageAPI.getAll(filterSession && filterSession !== "all" ? parseInt(filterSession) : undefined, 100),
    refetchInterval: 10000,
  });

  const { data: sessions } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const { data: contacts } = useQuery({
    queryKey: ["/api/contacts"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: messageAPI.send,
    onSuccess: () => {
      toast({
        title: "Mensagens enviadas",
        description: "Mensagens adicionadas à fila de envio",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setSendModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Falha ao enviar mensagens",
        variant: "destructive",
      });
    },
  });

  const uploadCSVMutation = useMutation({
    mutationFn: contactAPI.uploadCSV,
    onSuccess: (data) => {
      toast({
        title: "CSV processado",
        description: `${data.imported} contatos importados com sucesso`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setUploadModalOpen(false);
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro no upload",
        description: error.message || "Falha ao processar CSV",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setPhones("");
    setContent("");
    setSessionId("");
    setMessageType("text");
    setScheduledAt("");
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phones.trim() || !content.trim() || !sessionId) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const phoneList = phones.split(',').map(p => p.trim()).filter(p => p);
    
    sendMessageMutation.mutate({
      sessionId: parseInt(sessionId),
      phones: phoneList,
      content,
      type: messageType,
      scheduledAt: scheduledAt || undefined
    });
  };

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "Arquivo obrigatório",
        description: "Selecione um arquivo CSV",
        variant: "destructive",
      });
      return;
    }

    uploadCSVMutation.mutate(selectedFile);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Enviada</Badge>;
      case 'delivered':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Entregue</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const connectedSessions = sessions?.filter((s: any) => s.status === 'connected') || [];

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mensagens</h1>
            <p className="text-gray-600">Envie e gerencie suas mensagens WhatsApp</p>
          </div>
          
          <div className="flex space-x-2">
            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload de Contatos</DialogTitle>
                  <DialogDescription>
                    Importe uma lista de contatos via arquivo CSV
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="csvFile">Arquivo CSV</Label>
                    <Input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      O arquivo deve conter colunas: phone, name (opcional), email (opcional)
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setUploadModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={uploadCSVMutation.isPending}>
                      {uploadCSVMutation.isPending ? "Processando..." : "Upload"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Send className="h-4 w-4 mr-2" />
                  Nova Mensagem
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Enviar Mensagem</DialogTitle>
                  <DialogDescription>
                    Envie mensagens para um ou múltiplos destinatários
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="session">Sessão *</Label>
                      <Select value={sessionId} onValueChange={setSessionId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma sessão" />
                        </SelectTrigger>
                        <SelectContent>
                          {connectedSessions.length === 0 ? (
                            <SelectItem value="no-sessions" disabled>
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
                    <div>
                      <Label htmlFor="messageType">Tipo</Label>
                      <Select value={messageType} onValueChange={setMessageType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="image">Imagem</SelectItem>
                          <SelectItem value="document">Documento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="phones">Números *</Label>
                    <Textarea
                      id="phones"
                      placeholder="55119999999, 55118888888 (separados por vírgula)"
                      value={phones}
                      onChange={(e) => setPhones(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {contacts?.length > 0 && `${contacts.length} contatos disponíveis na base`}
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="content">Mensagem *</Label>
                    <Textarea
                      id="content"
                      placeholder="Digite sua mensagem aqui..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="scheduledAt">Agendamento (opcional)</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setSendModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={sendMessageMutation.isPending || connectedSessions.length === 0}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {sendMessageMutation.isPending ? "Enviando..." : "Enviar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={filterSession} onValueChange={setFilterSession}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas as sessões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as sessões</SelectItem>
                  {sessions?.map((session: any) => (
                    <SelectItem key={session.id} value={session.id.toString()}>
                      {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Mensagens</CardTitle>
          </CardHeader>
          <CardContent>
            {messages?.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma mensagem encontrada
                </h3>
                <p className="text-gray-500 mb-4">
                  Envie sua primeira mensagem para ver o histórico aqui
                </p>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setSendModalOpen(true)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Mensagem
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {messages?.map((message: any) => (
                  <div 
                    key={message.id}
                    className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {getTypeIcon(message.type)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3 w-3 mr-1" />
                            {message.phone}
                          </div>
                          {getStatusBadge(message.status)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(message.createdAt).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-900 mb-2">
                        {message.content || `Mensagem ${message.type}`}
                      </div>
                      
                      {message.scheduledAt && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          Agendada para: {new Date(message.scheduledAt).toLocaleString('pt-BR')}
                        </div>
                      )}
                      
                      {message.sentAt && (
                        <div className="text-xs text-gray-500">
                          Enviada em: {new Date(message.sentAt).toLocaleString('pt-BR')}
                        </div>
                      )}
                      
                      {message.failureReason && (
                        <div className="text-xs text-red-600 mt-1">
                          Erro: {message.failureReason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
