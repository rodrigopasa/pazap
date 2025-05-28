import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  WAMessageKey,
  proto,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import fs from 'fs';
import path from 'path';

export interface WhatsAppSession {
  sock?: any;
  sessionId: string;
  name: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'qr_needed';
  qrCode?: string;
  phone?: string;
  onQRUpdate?: (qr: string) => void;
  onStatusUpdate?: (status: string, phone?: string) => void;
  onMessage?: (message: any) => void;
}

export class BaileysClient {
  private sessions: Map<string, WhatsAppSession> = new Map();
  private logger: any;

  constructor() {
    this.logger = P({ level: 'silent' }); // Use 'debug' for verbose logging
  }

  async createSession(
    sessionId: string, 
    name: string,
    onQRUpdate?: (qr: string) => void,
    onStatusUpdate?: (status: string, phone?: string) => void,
    onMessage?: (message: any) => void
  ): Promise<string | null> {
    try {
      // Ensure session directory exists
      const sessionDir = path.join(process.cwd(), 'whatsapp_sessions', sessionId);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const { version, isLatest } = await fetchLatestBaileysVersion();

      console.log(`Using WhatsApp v${version.join('.')}, isLatest: ${isLatest}`);

      const session: WhatsAppSession = {
        sessionId,
        name,
        status: 'connecting',
        onQRUpdate,
        onStatusUpdate,
        onMessage
      };

      console.log('Creating WhatsApp socket...');

      const sock = makeWASocket({
        version,
        logger: this.logger,
        printQRInTerminal: false,
        auth: state,
        defaultQueryTimeoutMs: 60 * 1000,
        keepAliveIntervalMs: 30 * 1000,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
      });

      session.sock = sock;
      this.sessions.set(sessionId, session);

      // Event handlers
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr && onQRUpdate) {
          session.qrCode = qr;
          session.status = 'qr_needed';
          onQRUpdate(qr);
          onStatusUpdate?.('qr_needed');
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          
          if (shouldReconnect) {
            session.status = 'connecting';
            onStatusUpdate?.('connecting');
            console.log(`Session ${sessionId} disconnected, reconnecting...`);
            
            // Reconnect after delay
            setTimeout(() => {
              this.createSession(sessionId, name, onQRUpdate, onStatusUpdate, onMessage);
            }, 5000);
          } else {
            session.status = 'disconnected';
            onStatusUpdate?.('disconnected');
            console.log(`Session ${sessionId} logged out`);
            this.sessions.delete(sessionId);
          }
        } else if (connection === 'open') {
          session.status = 'connected';
          session.phone = sock.user?.id?.split(':')[0];
          onStatusUpdate?.('connected', session.phone);
          console.log(`Session ${sessionId} connected successfully`);
        }
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('messages.upsert', async (m) => {
        if (onMessage) {
          for (const message of m.messages) {
            onMessage(message);
          }
        }
      });

      // Return QR code if generated immediately
      return session.qrCode || null;
    } catch (error) {
      console.error(`Failed to create session ${sessionId}:`, error);
      throw error;
    }
  }

  async sendMessage(sessionId: string, phone: string, content: string, type: string = 'text', mediaUrl?: string): Promise<boolean> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.sock || session.status !== 'connected') {
        throw new Error(`Session ${sessionId} not connected`);
      }

      const jid = `${phone}@s.whatsapp.net`;
      
      if (type === 'text') {
        await session.sock.sendMessage(jid, { text: content });
      } else if (type === 'image' && mediaUrl) {
        await session.sock.sendMessage(jid, {
          image: { url: mediaUrl },
          caption: content
        });
      } else if (type === 'document' && mediaUrl) {
        await session.sock.sendMessage(jid, {
          document: { url: mediaUrl },
          caption: content,
          fileName: 'document.pdf'
        });
      }

      return true;
    } catch (error) {
      console.error(`Failed to send message via session ${sessionId}:`, error);
      return false;
    }
  }

  async createGroup(sessionId: string, groupName: string, participants: string[]): Promise<string | null> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.sock || session.status !== 'connected') {
        throw new Error(`Session ${sessionId} not connected`);
      }

      const participantJids = participants.map(phone => `${phone}@s.whatsapp.net`);
      
      const result = await session.sock.groupCreate(groupName, participantJids);
      return result.id;
    } catch (error) {
      console.error(`Failed to create group via session ${sessionId}:`, error);
      return null;
    }
  }

  async addToGroup(sessionId: string, groupId: string, participants: string[]): Promise<boolean> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.sock || session.status !== 'connected') {
        throw new Error(`Session ${sessionId} not connected`);
      }

      const participantJids = participants.map(phone => `${phone}@s.whatsapp.net`);
      
      await session.sock.groupParticipantsUpdate(groupId, participantJids, 'add');
      return true;
    } catch (error) {
      console.error(`Failed to add participants to group via session ${sessionId}:`, error);
      return false;
    }
  }

  getSession(sessionId: string): WhatsAppSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): WhatsAppSession[] {
    return Array.from(this.sessions.values());
  }

  async deleteSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session?.sock) {
      try {
        await session.sock.logout();
      } catch (error) {
        console.error(`Error logging out session ${sessionId}:`, error);
      }
    }
    
    this.sessions.delete(sessionId);
    
    // Clean up session files
    const sessionDir = path.join(process.cwd(), 'whatsapp_sessions', sessionId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }

  async reconnectSession(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await this.deleteSession(sessionId);
      return await this.createSession(
        sessionId, 
        session.name, 
        session.onQRUpdate, 
        session.onStatusUpdate, 
        session.onMessage
      );
    }
    return null;
  }
}
