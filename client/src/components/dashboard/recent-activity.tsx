import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  CheckIcon, 
  UploadIcon, 
  UsersIcon, 
  CakeIcon,
  ClockIcon,
  EditIcon 
} from "lucide-react";

export function RecentActivity() {
  const { data: messages } = useQuery({
    queryKey: ["/api/messages"],
  });

  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  // Get recent messages for activity feed
  const recentMessages = messages?.slice(0, 4) || [];
  const scheduledCampaigns = campaigns?.filter((c: any) => c.status === 'scheduled').slice(0, 3) || [];

  return (
    <div className="space-y-6">
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Atividade Recente</CardTitle>
            <Button variant="ghost" size="sm" className="text-whatsapp-600 hover:text-whatsapp-700">
              Ver todos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flow-root">
            <ul className="-mb-8">
              {recentMessages.length === 0 ? (
                <li className="text-center py-8 text-gray-500">
                  Nenhuma atividade recente
                </li>
              ) : (
                recentMessages.map((message: any, index: number) => (
                  <li key={message.id}>
                    <div className="relative pb-8">
                      {index < recentMessages.length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-white">
                            <CheckIcon className="h-4 w-4 text-green-600" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-900">
                              Mensagem enviada para <span className="font-medium">{message.phone}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              Status: {message.status}
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time>{new Date(message.createdAt).toLocaleTimeString()}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Próximos Agendamentos</CardTitle>
            <Button variant="ghost" size="sm" className="text-whatsapp-600 hover:text-whatsapp-700">
              Gerenciar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {scheduledCampaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum agendamento próximo
            </div>
          ) : (
            scheduledCampaigns.map((campaign: any) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ClockIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{campaign.name}</p>
                    <p className="text-xs text-gray-500">
                      {campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : 'Não agendado'} - {campaign.totalRecipients || 0} destinatários
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={
                    campaign.type === 'birthday' ? 'bg-green-100 text-green-800' :
                    campaign.type === 'marketing' ? 'bg-purple-100 text-purple-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {campaign.type}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <EditIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl text-gray-400 mb-4">📊</div>
              <p className="text-gray-500 text-sm">Gráfico de Performance</p>
              <p className="text-xs text-gray-400 mt-1">Mensagens enviadas nos últimos 7 dias</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
