import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SendIcon, XIcon } from "lucide-react";
import { z } from "zod";

const quickSendSchema = z.object({
  phones: z.string().min(1, "Informe pelo menos um número"),
  message: z.string().min(1, "Mensagem é obrigatória"),
  sessionId: z.number().min(1, "Selecione uma sessão"),
});

interface QuickSendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickSendModal({ open, onOpenChange }: QuickSendModalProps) {
  const { toast } = useToast();

  const { data: sessions } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const form = useForm({
    resolver: zodResolver(quickSendSchema),
    defaultValues: {
      phones: "",
      message: "",
      sessionId: 0,
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof quickSendSchema>) => {
      const phones = data.phones.split(',').map(p => p.trim()).filter(p => p);
      const payload = {
        ...data,
        phones,
        sessionId: Number(data.sessionId),
      };
      const response = await apiRequest("POST", "/api/messages/send", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      onOpenChange(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Mensagem enviada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: z.infer<typeof quickSendSchema>) => {
    sendMessageMutation.mutate(data);
  };

  const activeSessions = sessions?.filter((s: any) => s.isActive) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Envio Rápido</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="phones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número(s)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="55119999999 ou múltiplos separados por vírgula" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={4}
                      placeholder="Digite sua mensagem aqui..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sessionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sessão</FormLabel>
                  <Select onValueChange={(value) => field.onChange(Number(value))}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma sessão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeSessions.map((session: any) => (
                        <SelectItem key={session.id} value={session.id.toString()}>
                          {session.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={sendMessageMutation.isPending}
                className="bg-whatsapp-500 hover:bg-whatsapp-600 text-white"
              >
                <SendIcon className="h-4 w-4 mr-2" />
                {sendMessageMutation.isPending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
