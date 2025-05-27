import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
        
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  };

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'qr_update':
        // Invalidate sessions to show new QR code
        queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
        toast({
          title: 'QR Code Atualizado',
          description: `Escaneie o QR code para conectar a sessão ${message.sessionId}`,
        });
        break;

      case 'session_status':
        // Invalidate sessions and stats when session status changes
        queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        
        if (message.status === 'connected') {
          toast({
            title: 'Sessão Conectada',
            description: `Sessão ${message.sessionId} conectada com sucesso`,
          });
        } else if (message.status === 'disconnected') {
          toast({
            title: 'Sessão Desconectada',
            description: `Sessão ${message.sessionId} foi desconectada`,
            variant: 'destructive',
          });
        }
        break;

      case 'message_sent':
        // Invalidate messages and stats when message is sent
        queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        break;

      case 'message_failed':
        // Invalidate messages when message fails
        queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        
        toast({
          title: 'Falha no Envio',
          description: `Mensagem para ${message.phone} falhou: ${message.error}`,
          variant: 'destructive',
        });
        break;

      case 'incoming_message':
        // Show notification for incoming messages
        toast({
          title: 'Nova Mensagem',
          description: `Mensagem recebida de ${message.message.from}`,
        });
        break;

      case 'campaign_update':
        // Invalidate campaigns when campaign status changes
        queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  const sendMessage = (message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    sendMessage
  };
}
