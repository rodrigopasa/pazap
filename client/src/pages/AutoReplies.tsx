import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, Bot, MessageSquare, Settings, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AutoReply {
  id: number;
  trigger: string;
  response: string;
  isActive: boolean;
  matchType: 'exact' | 'contains' | 'starts_with' | 'ends_with';
  priority: number;
  description?: string;
  sessionId?: number;
  createdAt: string;
}

export default function AutoReplies() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<AutoReply | null>(null);
  const [formData, setFormData] = useState({
    trigger: '',
    response: '',
    matchType: 'contains' as const,
    priority: 1,
    description: '',
    sessionId: undefined as number | undefined,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar respostas automáticas
  const { data: autoReplies, isLoading } = useQuery({
    queryKey: ["/api/auto-replies"],
  });

  // Buscar sessões para seleção
  const { data: sessions } = useQuery({
    queryKey: ["/api/sessions"],
  });

  // Buscar estatísticas
  const { data: stats } = useQuery({
    queryKey: ["/api/auto-replies/stats"],
  });

  // Mutation para criar resposta automática
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/auto-replies", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-replies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-replies/stats"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Resposta automática criada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar resposta automática.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar resposta automática
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/auto-replies/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-replies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-replies/stats"] });
      setEditingReply(null);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Resposta automática atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar resposta automática.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar resposta automática
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/auto-replies/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-replies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-replies/stats"] });
      toast({
        title: "Sucesso!",
        description: "Resposta automática removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover resposta automática.",
        variant: "destructive",
      });
    },
  });

  // Mutation para ativar/desativar resposta
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => 
      apiRequest(`/api/auto-replies/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ isActive }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-replies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-replies/stats"] });
    },
  });

  const resetForm = () => {
    setFormData({
      trigger: '',
      response: '',
      matchType: 'contains',
      priority: 1,
      description: '',
      sessionId: undefined,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.trigger.trim() || !formData.response.trim()) {
      toast({
        title: "Erro",
        description: "Palavra-chave e resposta são obrigatórias.",
        variant: "destructive",
      });
      return;
    }

    if (editingReply) {
      updateMutation.mutate({ id: editingReply.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (reply: AutoReply) => {
    setEditingReply(reply);
    setFormData({
      trigger: reply.trigger,
      response: reply.response,
      matchType: reply.matchType,
      priority: reply.priority,
      description: reply.description || '',
      sessionId: reply.sessionId,
    });
    setIsCreateDialogOpen(true);
  };

  const getMatchTypeLabel = (type: string) => {
    const labels = {
      exact: 'Exata',
      contains: 'Contém',
      starts_with: 'Inicia com',
      ends_with: 'Termina com'
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center space-x-2">
          <Bot className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Respostas Automáticas</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Respostas Automáticas</h1>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingReply(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Resposta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingReply ? 'Editar Resposta Automática' : 'Nova Resposta Automática'}
              </DialogTitle>
              <DialogDescription>
                Configure uma resposta que será enviada automaticamente quando uma palavra-chave for detectada.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trigger">Palavra-chave</Label>
                  <Input
                    id="trigger"
                    value={formData.trigger}
                    onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value }))}
                    placeholder="Ex: olá, preço, horário"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="matchType">Tipo de Correspondência</Label>
                  <Select 
                    value={formData.matchType} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, matchType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contém</SelectItem>
                      <SelectItem value="exact">Exata</SelectItem>
                      <SelectItem value="starts_with">Inicia com</SelectItem>
                      <SelectItem value="ends_with">Termina com</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="response">Resposta</Label>
                <Textarea
                  id="response"
                  value={formData.response}
                  onChange={(e) => setFormData(prev => ({ ...prev, response: e.target.value }))}
                  placeholder="Digite a resposta que será enviada automaticamente..."
                  className="min-h-[100px]"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variáveis disponíveis: {"{nome}"}, {"{numero}"}, {"{hora}"}, {"{data}"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">1 = menor, 10 = maior prioridade</p>
                </div>

                <div>
                  <Label htmlFor="session">Sessão (Opcional)</Label>
                  <Select 
                    value={formData.sessionId?.toString() || "all"} 
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      sessionId: value === "all" ? undefined : parseInt(value) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
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

              <div>
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição para identificar esta resposta"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingReply ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total || 0}</div>
              <p className="text-xs text-gray-500">Respostas configuradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativas</CardTitle>
              <Settings className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active || 0}</div>
              <p className="text-xs text-gray-500">Funcionando agora</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inativas</CardTitle>
              <BarChart3 className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.inactive || 0}</div>
              <p className="text-xs text-gray-500">Desabilitadas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Respostas */}
      <div className="space-y-4">
        {autoReplies?.length > 0 ? (
          autoReplies.map((reply: AutoReply) => (
            <Card key={reply.id} className={`transition-all ${reply.isActive ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={reply.isActive ? "default" : "secondary"}>
                        {reply.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                      <Badge variant="outline">
                        {getMatchTypeLabel(reply.matchType)}
                      </Badge>
                      <Badge variant="outline">
                        Prioridade {reply.priority}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Palavra-chave:</span>
                        <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {reply.trigger}
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-gray-700">Resposta:</span>
                        <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {reply.response}
                        </p>
                      </div>
                      
                      {reply.description && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Descrição:</span>
                          <p className="mt-1 text-sm text-gray-600">{reply.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Switch
                      checked={reply.isActive}
                      onCheckedChange={(checked) => 
                        toggleMutation.mutate({ id: reply.id, isActive: checked })
                      }
                      disabled={toggleMutation.isPending}
                    />
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(reply)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(reply.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma resposta automática configurada
              </h3>
              <p className="text-gray-500 mb-4">
                Crie sua primeira resposta automática para começar a automatizar seu atendimento.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira resposta
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}