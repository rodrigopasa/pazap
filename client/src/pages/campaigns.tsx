import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { campaignAPI, birthdayAPI } from "@/lib/api";
import {
  Plus,
  Play,
  Pause,
  Settings,
  Trash2,
  Megaphone,
  Users,
  Calendar,
  Clock,
  Cake,
  Upload,
  Target,
  CheckCircle,
  XCircle,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Smile
} from "lucide-react";

export default function Campaigns() {
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [birthdayUploadOpen, setBirthdayUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("bulk");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  // Lista de emojis populares
  const popularEmojis = [
    '😀', '😃', '😄', '😁', '😊', '😍', '🥰', '😘',
    '😎', '🤗', '🤔', '😴', '🤯', '😱', '😭', '😂',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '👍', '👎', '👌', '✌️', '🤞', '👏', '🙌', '🤝',
    '🔥', '⭐', '✨', '🎉', '🎊', '💯', '✅', '❌'
  ];

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
    refetchInterval: 15000,
  });

  const { data: birthdays } = useQuery({
    queryKey: ["/api/birthdays"],
  });

  const createCampaignMutation = useMutation({
    mutationFn: campaignAPI.create,
    onSuccess: () => {
      toast({
        title: "Campanha criada",
        description: "Nova campanha criada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setNewCampaignOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar campanha",
        description: error.message || "Falha ao criar campanha",
        variant: "destructive",
      });
    },
  });

  const startCampaignMutation = useMutation({
    mutationFn: campaignAPI.start,
    onSuccess: () => {
      toast({
        title: "Campanha iniciada",
        description: "A campanha foi iniciada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar campanha",
        description: error.message || "Falha ao iniciar campanha",
        variant: "destructive",
      });
    },
  });

  const uploadBirthdaysMutation = useMutation({
    mutationFn: (file: File) => birthdayAPI.uploadCSV(file),
    onSuccess: (data) => {
      toast({
        title: "Aniversários importados",
        description: `${data.imported} aniversários importados com sucesso`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/birthdays"] });
      setBirthdayUploadOpen(false);
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro no upload",
        description: error.message || "Falha ao processar CSV de aniversários",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setType("bulk");
    setMessageTemplate("");
    setScheduledAt("");
    setPhoneNumbers("");
    setMediaFile(null);
    setMediaPreview(null);
    setShowEmojiPicker(false);
  };

  // Funções de formatação de texto
  const addFormatting = (format: string) => {
    const textarea = document.getElementById('messageTemplate') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = messageTemplate.substring(start, end);
    
    let formattedText = "";
    switch (format) {
      case "bold":
        formattedText = `*${selectedText}*`;
        break;
      case "italic":
        formattedText = `_${selectedText}_`;
        break;
      case "strikethrough":
        formattedText = `~${selectedText}~`;
        break;
      case "monospace":
        formattedText = `\`\`\`${selectedText}\`\`\``;
        break;
    }
    
    const newContent = messageTemplate.substring(0, start) + formattedText + messageTemplate.substring(end);
    setMessageTemplate(newContent);
  };

  const addEmoji = (emoji: string) => {
    setMessageTemplate(prev => prev + emoji);
  };

  // Função para lidar com upload de mídia
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    
    // Criar preview para imagens
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setMediaPreview(null);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !messageTemplate.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e template da mensagem são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Validação específica para campanhas em massa e agendadas
    if ((type === 'bulk' || type === 'scheduled') && !phoneNumbers.trim()) {
      toast({
        title: "Números obrigatórios",
        description: "Para campanhas em massa e agendadas, os números de telefone são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Processar números de telefone
    let processedNumbers: string[] = [];
    if (type === 'bulk' || type === 'scheduled') {
      processedNumbers = phoneNumbers
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(phone => phone.replace(/\D/g, '')); // Remove caracteres não numéricos
      
      if (processedNumbers.length === 0) {
        toast({
          title: "Números inválidos",
          description: "Nenhum número válido foi encontrado",
          variant: "destructive",
        });
        return;
      }
    }

    // Criar FormData para suportar upload de arquivo
    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('description', description.trim());
    formData.append('type', type);
    formData.append('messageTemplate', messageTemplate.trim());
    
    if (scheduledAt) {
      formData.append('scheduledAt', scheduledAt);
    }
    
    if (processedNumbers.length > 0) {
      formData.append('phoneNumbers', JSON.stringify(processedNumbers));
    }
    
    if (mediaFile) {
      formData.append('media', mediaFile);
    }

    createCampaignMutation.mutate(formData);
  };

  const handleUploadBirthdays = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "Arquivo obrigatório",
        description: "Selecione um arquivo CSV",
        variant: "destructive",
      });
      return;
    }

    uploadBirthdaysMutation.mutate(selectedFile);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><Play className="h-3 w-3 mr-1" />Ativa</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Concluída</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800"><Pause className="h-3 w-3 mr-1" />Pausada</Badge>;
      case 'draft':
        return <Badge variant="outline"><Settings className="h-3 w-3 mr-1" />Rascunho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'birthday':
        return <Cake className="h-5 w-5" />;
      case 'bulk':
        return <Megaphone className="h-5 w-5" />;
      case 'scheduled':
        return <Clock className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'birthday':
        return 'Aniversário';
      case 'bulk':
        return 'Em Massa';
      case 'scheduled':
        return 'Agendada';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
              ))}
            </div>
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
            <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
            <p className="text-gray-600">Gerencie suas campanhas de mensagens</p>
          </div>
          
          <div className="flex space-x-2">
            <Dialog open={birthdayUploadOpen} onOpenChange={setBirthdayUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Cake className="h-4 w-4 mr-2" />
                  Aniversários
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload de Aniversários</DialogTitle>
                  <DialogDescription>
                    Importe uma lista de aniversários via arquivo CSV
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUploadBirthdays} className="space-y-4">
                  <div>
                    <Label htmlFor="birthdayFile">Arquivo CSV</Label>
                    <Input
                      id="birthdayFile"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      O arquivo deve conter: phone, name, birthDate (DD/MM/YYYY ou YYYY-MM-DD)
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setBirthdayUploadOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={uploadBirthdaysMutation.isPending}>
                      {uploadBirthdaysMutation.isPending ? "Processando..." : "Upload"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={newCampaignOpen} onOpenChange={setNewCampaignOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Campanha
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Nova Campanha</DialogTitle>
                  <DialogDescription>
                    Configure uma nova campanha de mensagens
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome da Campanha *</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Promoção Black Friday"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Tipo</Label>
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bulk">Em Massa</SelectItem>
                          <SelectItem value="birthday">Aniversário</SelectItem>
                          <SelectItem value="scheduled">Agendada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      placeholder="Descrição da campanha"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="messageTemplate">Template da Mensagem *</Label>
                    
                    {/* Toolbar de formatação profissional */}
                    <div className="border border-gray-300 rounded-t-md p-2 bg-gray-50 flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addFormatting('bold')}
                          className="h-8 w-8 p-0"
                          title="Negrito (*texto*)"
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addFormatting('italic')}
                          className="h-8 w-8 p-0"
                          title="Itálico (_texto_)"
                        >
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addFormatting('strikethrough')}
                          className="h-8 w-8 p-0"
                          title="Riscado (~texto~)"
                        >
                          <Strikethrough className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addFormatting('monospace')}
                          className="h-8 w-8 p-0"
                          title="Monoespaçado (```texto```)"
                        >
                          <Code className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="w-px h-6 bg-gray-300"></div>
                      
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="h-8 px-2"
                          title="Adicionar emoji"
                        >
                          <Smile className="h-4 w-4 mr-1" />
                          😊
                        </Button>
                        
                        {showEmojiPicker && (
                          <div className="absolute top-10 left-0 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-64">
                            <div className="text-xs text-gray-500 mb-2 font-medium">Emojis populares</div>
                            <div className="grid grid-cols-8 gap-1">
                              {popularEmojis.map((emoji, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => addEmoji(emoji)}
                                  className="w-8 h-8 text-lg hover:bg-gray-100 rounded flex items-center justify-center"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="w-px h-6 bg-gray-300"></div>
                      
                      <div className="text-xs text-gray-500">
                        *negrito* _itálico_ ~riscado~ ```código```
                      </div>
                    </div>
                    
                    <Textarea
                      id="messageTemplate"
                      placeholder="Digite o template da mensagem..."
                      value={messageTemplate}
                      onChange={(e) => setMessageTemplate(e.target.value)}
                      rows={4}
                      className="rounded-t-none border-t-0 focus:ring-0"
                    />
                  </div>
                  
                  {/* Campo de upload de mídia */}
                  <div>
                    <Label htmlFor="mediaFile">Imagem ou Arquivo (Opcional)</Label>
                    <div className="space-y-3">
                      <Input
                        id="mediaFile"
                        type="file"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                        onChange={handleMediaUpload}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-gray-500">
                        Formatos suportados: Imagens (JPG, PNG, GIF), Vídeos (MP4, AVI), Áudios (MP3, WAV), Documentos (PDF, DOC, TXT)
                      </p>
                      
                      {/* Preview da mídia */}
                      {mediaFile && (
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Arquivo selecionado:</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={removeMedia}
                              className="h-6 w-6 p-0"
                            >
                              ×
                            </Button>
                          </div>
                          
                          {mediaPreview ? (
                            <div className="space-y-2">
                              <img 
                                src={mediaPreview} 
                                alt="Preview" 
                                className="max-w-full h-32 object-cover rounded border"
                              />
                              <p className="text-xs text-gray-600">{mediaFile.name} ({(mediaFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                📄
                              </div>
                              <div className="text-sm">
                                <p className="font-medium text-gray-700">{mediaFile.name}</p>
                                <p className="text-gray-500">{(mediaFile.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Campo de números para campanhas em massa */}
                  {(type === 'bulk' || type === 'scheduled') && (
                    <div>
                      <Label htmlFor="phoneNumbers">Números de Telefone *</Label>
                      <p className="text-xs text-gray-500 mb-2">
                        Cole os números um por linha. Formato: (11) 99999-9999 ou 11999999999
                      </p>
                      <Textarea
                        id="phoneNumbers"
                        placeholder="Cole os números aqui, um por linha:&#10;(11) 99999-9999&#10;(21) 88888-8888&#10;11977777777"
                        value={phoneNumbers}
                        onChange={(e) => setPhoneNumbers(e.target.value)}
                        rows={6}
                        className="font-mono text-sm"
                      />
                      {phoneNumbers && (
                        <p className="text-xs text-gray-500 mt-1">
                          {phoneNumbers.split('\n').filter(line => line.trim()).length} números detectados
                        </p>
                      )}
                    </div>
                  )}
                  
                  {type === 'scheduled' && (
                    <div>
                      <Label htmlFor="scheduledAt">Data/Hora de Envio</Label>
                      <Input
                        id="scheduledAt"
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setNewCampaignOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createCampaignMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {createCampaignMutation.isPending ? "Criando..." : "Criar Campanha"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-xl font-bold">{campaigns?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Play className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Ativas</p>
                  <p className="text-xl font-bold">{campaigns?.filter((c: any) => c.status === 'active').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Concluídas</p>
                  <p className="text-xl font-bold">{campaigns?.filter((c: any) => c.status === 'completed').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Cake className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Aniversários</p>
                  <p className="text-xl font-bold">{birthdays?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns Grid */}
        {campaigns?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma campanha criada
              </h3>
              <p className="text-gray-500 mb-4">
                Crie sua primeira campanha para automatizar envios de mensagens
              </p>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setNewCampaignOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Campanha
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns?.map((campaign: any) => (
              <Card key={campaign.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {getTypeIcon(campaign.type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <CardDescription>{getTypeLabel(campaign.type)}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(campaign.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {campaign.description && (
                    <p className="text-sm text-gray-600">{campaign.description}</p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span>{campaign.sentCount || 0} / {campaign.targetCount || 0}</span>
                    </div>
                    <Progress 
                      value={campaign.targetCount > 0 ? (campaign.sentCount / campaign.targetCount) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Sucesso</p>
                      <p className="font-medium text-green-600">{campaign.successCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Falhas</p>
                      <p className="font-medium text-red-600">{campaign.failureCount || 0}</p>
                    </div>
                  </div>
                  
                  {campaign.scheduledAt && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(campaign.scheduledAt).toLocaleString('pt-BR')}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    {campaign.status === 'draft' ? (
                      <Button
                        size="sm"
                        onClick={() => startCampaignMutation.mutate(campaign.id)}
                        disabled={startCampaignMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Iniciar
                      </Button>
                    ) : campaign.status === 'active' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Pause className="h-3 w-3 mr-1" />
                        Pausar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings className="h-3 w-3 mr-1" />
                        Detalhes
                      </Button>
                    )}
                    
                    <Button size="sm" variant="destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
