import { BaileysClient } from './baileys';
import { storage } from '../storage';

class SessionManager {
  private baileys: BaileysClient;
  private broadcast?: (data: any) => void;

  constructor() {
    this.baileys = new BaileysClient();
  }

  setBroadcast(broadcastFn: (data: any) => void) {
    this.broadcast = broadcastFn;
  }

  async createSession(sessionId: string, name: string): Promise<string | null> {
    const qrCode = await this.baileys.createSession(
      sessionId,
      name,
      (qr) => this.handleQRUpdate(sessionId, qr),
      (status, phone) => this.handleStatusUpdate(sessionId, status, phone),
      (message) => this.handleMessage(sessionId, message)
    );

    return qrCode;
  }

  async reconnectSession(sessionId: string): Promise<string | null> {
    const session = await storage.getSessionBySessionId(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return await this.baileys.reconnectSession(sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.baileys.deleteSession(sessionId);
  }

  async sendMessage(sessionId: string, phone: string, content: string, type: string = 'text', mediaUrl?: string): Promise<boolean> {
    return await this.baileys.sendMessage(sessionId, phone, content, type, mediaUrl);
  }

  async createGroup(sessionId: string, groupName: string, participants: string[]): Promise<string | null> {
    return await this.baileys.createGroup(sessionId, groupName, participants);
  }

  async addToGroup(sessionId: string, groupId: string, participants: string[]): Promise<boolean> {
    return await this.baileys.addToGroup(sessionId, groupId, participants);
  }

  getSessionStatus(sessionId: string): string {
    const session = this.baileys.getSession(sessionId);
    return session?.status || 'disconnected';
  }

  getAllSessions() {
    return this.baileys.getAllSessions();
  }

  private async handleQRUpdate(sessionId: string, qrCode: string) {
    try {
      const session = await storage.getSessionBySessionId(sessionId);
      if (session) {
        await storage.updateSession(session.id, { 
          qrCode, 
          status: 'qr_needed' 
        });

        // Broadcast QR update
        this.broadcast?.({
          type: 'qr_update',
          sessionId,
          qrCode
        });

        // Create notification
        await storage.createNotification({
          userId: session.userId,
          type: 'info',
          title: 'QR Code Gerado',
          message: `Escaneie o QR code para conectar a sessão ${session.name}`,
          metadata: { sessionId }
        });
      }
    } catch (error) {
      console.error('Error handling QR update:', error);
    }
  }

  private async handleStatusUpdate(sessionId: string, status: string, phone?: string) {
    try {
      const session = await storage.getSessionBySessionId(sessionId);
      if (session) {
        const updates: any = { status };
        
        if (phone) {
          updates.phone = phone;
        }
        
        if (status === 'connected') {
          updates.lastConnected = new Date();
          updates.qrCode = null; // Clear QR code when connected
        }

        await storage.updateSession(session.id, updates);

        // Broadcast status update
        this.broadcast?.({
          type: 'session_status',
          sessionId,
          status,
          phone
        });

        // Create notification
        let notificationMessage = '';
        let notificationType = 'info';
        
        switch (status) {
          case 'connected':
            notificationMessage = `Sessão ${session.name} conectada com sucesso`;
            notificationType = 'success';
            break;
          case 'disconnected':
            notificationMessage = `Sessão ${session.name} foi desconectada`;
            notificationType = 'error';
            break;
          case 'connecting':
            notificationMessage = `Conectando sessão ${session.name}...`;
            break;
        }

        if (notificationMessage) {
          await storage.createNotification({
            userId: session.userId,
            type: notificationType,
            title: 'Status da Sessão',
            message: notificationMessage,
            metadata: { sessionId, status }
          });
        }

        // Log the event
        await storage.createLog({
          level: status === 'connected' ? 'info' : status === 'disconnected' ? 'warn' : 'info',
          source: 'session',
          message: `Session ${sessionId} status changed to ${status}`,
          metadata: { sessionId, status, phone },
          sessionId: session.id,
          userId: session.userId
        });
      }
    } catch (error) {
      console.error('Error handling status update:', error);
    }
  }

  private async handleMessage(sessionId: string, message: any) {
    try {
      // Log incoming messages if needed
      await storage.createLog({
        level: 'info',
        source: 'whatsapp',
        message: 'Incoming message received',
        metadata: { 
          sessionId, 
          messageId: message.key?.id,
          from: message.key?.remoteJid,
          messageType: message.message ? Object.keys(message.message)[0] : 'unknown'
        }
      });

      // Broadcast incoming message
      this.broadcast?.({
        type: 'incoming_message',
        sessionId,
        message: {
          id: message.key?.id,
          from: message.key?.remoteJid,
          timestamp: message.messageTimestamp,
          content: message.message?.conversation || 'Media message'
        }
      });
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  // Initialize existing sessions on startup
  async initializeSessions() {
    try {
      const sessions = await storage.getSessions(1); // TODO: Support multiple users
      
      for (const session of sessions) {
        if (session.isActive) {
          console.log(`Initializing session: ${session.sessionId}`);
          await this.createSession(session.sessionId, session.name);
        }
      }
    } catch (error) {
      console.error('Error initializing sessions:', error);
    }
  }
}

export const sessionManager = new SessionManager();

// Initialize sessions on startup
setTimeout(() => {
  sessionManager.initializeSessions();
}, 2000);
