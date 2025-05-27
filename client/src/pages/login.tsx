import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Shield } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string>("");
  const queryClient = useQueryClient();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao fazer login");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalida o cache da autenticação para forçar uma nova verificação
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Pequeno delay para garantir que a invalidação aconteça
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 100);
    },
    onError: (error: any) => {
      setError(error.message || "Erro ao fazer login");
    },
  });

  const onSubmit = (data: LoginFormData) => {
    setError("");
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center pazap-gradient-soft relative overflow-hidden p-4">
      {/* Background floating elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-200/10 rounded-full blur-3xl float" style={{animationDelay: '2s'}}></div>
      </div>
      
      <Card className="w-full max-w-md glass-effect shadow-2xl border-0 relative z-10">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="flex items-center justify-center space-x-3">
            <div className="pazap-gradient p-3 rounded-2xl shadow-lg pulse-orange">
              <MessageSquare className="h-10 w-10 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">
              PaZap
            </h1>
            <p className="text-lg text-gray-600 mt-2 font-medium">Sistema de Gestão WhatsApp</p>
          </div>
          <div className="flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-50 to-blue-50 px-4 py-2 rounded-full border border-orange-200/50">
            <Shield className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">Área Restrita</span>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuário</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite seu usuário" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Digite sua senha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full pazap-gradient hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-white font-semibold py-3 rounded-xl"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Entrando...</span>
                  </div>
                ) : (
                  "Entrar no PaZap"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-orange-300"></div>
              <p className="text-sm font-semibold bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">
                PaZap
              </p>
              <div className="w-8 h-0.5 bg-gradient-to-l from-transparent to-blue-300"></div>
            </div>
            <p className="text-xs text-gray-500">
              Sistema Avançado de Gestão WhatsApp
            </p>
            <p className="text-xs text-gray-400">
              Para suporte técnico, entre em contato com o administrador
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}