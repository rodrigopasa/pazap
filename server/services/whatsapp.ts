import * as Baileys from '@whiskeysockets/baileys';

// Extract exports for compatibility
const makeWASocket = Baileys.default || Baileys.makeWASocket || Baileys;
const {
  DisconnectReason,
  useMultiFileAuthState,
  MessageRetryMap,
  makeInMemoryStore,
  proto,
  WAMessageContent,
  WAMessageKey,
  MediaType,
  jidDecode
} = Baileys;
import { Boom } from '@hapi/boom';
import { storage } from '../storage';
import fs from 'fs';
import path from 'path';

interface WhatsAppSession {
  socket: any;
  store: any;
  qrCode?: string;
  isConnected: boolean;
}

class WhatsAppService {
  private sessions: Map<string, WhatsAppSession> = new Map();
  private authDir = path.join(process.cwd(), 'auth_info');

  constructor() {
    // Ensure auth directory exists
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  async initSession(sessionId: string): Promise<void> {
    try {
      const sessionDir = path.join(this.authDir, sessionId);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const store = makeInMemoryStore({});

      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: {
          level: 'error',
          child: () => ({ level: 'error' }),
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
        }
      });

      store.bind(socket.ev);

      const session: WhatsAppSession = {
        socket,
        store,
        isConnected: false,
      };

      this.sessions.set(sessionId, session);

      // Handle connection updates
      socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          session.qrCode = qr;
          await this.updateSessionInDB(sessionId, { qrCode: qr, status: 'qr_needed' });
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          
          if (shouldReconnect) {
            await this.initSession(sessionId);
          } else {
            session.isConnected = false;
            await this.updateSessionInDB(sessionId, { isActive: false, status: 'disconnected' });
            this.sessions.delete(sessionId);
          }
        } else if (connection === 'open') {
          session.isConnected = true;
          const phone = socket.user?.id ? jidDecode(socket.user.id)?.user : undefined;
          
          await this.updateSessionInDB(sessionId, { 
            isActive: true, 
            status: 'connected',
            phone: phone ? `+${phone}` : undefined,
            lastSeen: new Date(),
            qrCode: null 
          });

          await this.createLog(sessionId, 'info', 'Session connected successfully');
        }
      });

      // Handle credentials update
      socket.ev.on('creds.update', saveCreds);

      // Handle incoming messages (for webhook/logging purposes)
      socket.ev.on('messages.upsert', async (m) => {
        const messages = m.messages;
        for (const message of messages) {
          if (!message.key.fromMe && message.message) {
            // Log incoming messages if needed
            await this.createLog(sessionId, 'info', `Received message from ${message.key.remoteJid}`);
          }
        }
      });

    } catch (error) {
      await this.createLog(sessionId, 'error', `Failed to initialize session: ${error.message}`);
      throw error;
    }
  }

  async getQRCode(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    return session?.qrCode || null;
  }

  async connectSession(sessionId: string): Promise<void> {
    if (!this.sessions.has(sessionId)) {
      await this.initSession(sessionId);
    }
  }

  async disconnectSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.socket.end();
      session.isConnected = false;
      this.sessions.delete(sessionId);
      
      await this.updateSessionInDB(sessionId, { isActive: false, status: 'disconnected' });
      await this.createLog(sessionId, 'info', 'Session disconnected');
    }
  }

  async sendMessage(sessionId: string, phone: string, content: string, mediaUrl?: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isConnected) {
      throw new Error('Session not connected');
    }

    try {
      // Format phone number to WhatsApp format
      const formattedPhone = this.formatPhoneNumber(phone);
      
      let messageContent: WAMessageContent;

      if (mediaUrl) {
        // Handle media messages
        const mediaType = this.getMediaTypeFromUrl(mediaUrl);
        
        if (mediaType === 'image') {
          messageContent = {
            image: { url: mediaUrl },
            caption: content
          };
        } else if (mediaType === 'document') {
          messageContent = {
            document: { url: mediaUrl },
            fileName: path.basename(mediaUrl),
            caption: content
          };
        } else {
          // Fallback to text
          messageContent = { text: content };
        }
      } else {
        messageContent = { text: content };
      }

      const result = await session.socket.sendMessage(formattedPhone, messageContent);
      
      await this.createLog(sessionId, 'info', `Message sent to ${phone}`);
      
      return result.key.id || null;
    } catch (error) {
      await this.createLog(sessionId, 'error', `Failed to send message to ${phone}: ${error.message}`);
      throw error;
    }
  }

  async createGroup(sessionId: string, name: string, description?: string, members?: string[]): Promise<string> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isConnected) {
      throw new Error('Session not connected');
    }

    try {
      const formattedMembers = members ? members.map(phone => this.formatPhoneNumber(phone)) : [];
      
      const result = await session.socket.groupCreate(name, formattedMembers);
      
      if (description && result.id) {
        await session.socket.groupUpdateDescription(result.id, description);
      }
      
      await this.createLog(sessionId, 'info', `Group "${name}" created with ${formattedMembers.length} members`);
      
      return result.id;
    } catch (error) {
      await this.createLog(sessionId, 'error', `Failed to create group "${name}": ${error.message}`);
      throw error;
    }
  }

  async addMembersToGroup(sessionId: string, groupId: string, members: string[]): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isConnected) {
      throw new Error('Session not connected');
    }

    try {
      const formattedMembers = members.map(phone => this.formatPhoneNumber(phone));
      await session.socket.groupParticipantsUpdate(groupId, formattedMembers, 'add');
      
      await this.createLog(sessionId, 'info', `Added ${formattedMembers.length} members to group ${groupId}`);
    } catch (error) {
      await this.createLog(sessionId, 'error', `Failed to add members to group ${groupId}: ${error.message}`);
      throw error;
    }
  }

  async getGroupsFromWhatsApp(sessionId: string): Promise<any[]> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isConnected) {
      throw new Error('Session not connected');
    }

    try {
      await this.createLog(sessionId, 'info', 'Starting group synchronization...');
      
      // Buscar todos os chats usando store
      const store = session.store;
      const chats = store.chats.all();
      const groups = chats.filter(chat => chat.id.endsWith('@g.us'));
      
      await this.createLog(sessionId, 'info', `Found ${groups.length} groups in chat list`);
      
      const groupsData = [];
      
      for (const group of groups) {
        try {
          let groupMetadata = null;
          
          // Tentar buscar metadados do grupo
          try {
            groupMetadata = await session.socket.groupMetadata(group.id);
          } catch (metaError) {
            await this.createLog(sessionId, 'warn', `Could not fetch metadata for group ${group.id}: ${metaError.message}`);
          }
          
          // Buscar informações do usuário atual
          const currentUser = session.socket.user?.id;
          let isAdmin = false;
          
          if (groupMetadata && groupMetadata.participants && currentUser) {
            const userNumber = currentUser.split(':')[0];
            isAdmin = groupMetadata.participants.some(p => 
              p.id.includes(userNumber) && 
              (p.admin === 'admin' || p.admin === 'superadmin')
            );
          }
          
          const groupData = {
            whatsappId: group.id,
            name: groupMetadata?.subject || group.name || `Grupo ${group.id.split('@')[0]}`,
            description: groupMetadata?.desc || '',
            memberCount: groupMetadata?.participants?.length || 0,
            isAdmin: isAdmin,
            lastMessageTime: group.conversationTimestamp || null,
            unreadCount: group.unreadCount || 0
          };
          
          groupsData.push(groupData);
          
          await this.createLog(sessionId, 'debug', `Processed group: ${groupData.name} (${groupData.memberCount} members)`);
          
        } catch (error) {
          await this.createLog(sessionId, 'warn', `Error processing group ${group.id}: ${error.message}`);
          
          // Adicionar grupo com informações básicas mesmo se houver erro
          groupsData.push({
            whatsappId: group.id,
            name: group.name || `Grupo ${group.id.split('@')[0]}`,
            description: '',
            memberCount: 0,
            isAdmin: false,
            lastMessageTime: group.conversationTimestamp || null,
            unreadCount: group.unreadCount || 0
          });
        }
      }
      
      await this.createLog(sessionId, 'info', `Successfully processed ${groupsData.length} groups`);
      return groupsData;
      
    } catch (error) {
      await this.createLog(sessionId, 'error', `Failed to get groups: ${error.message}`);
      throw error;
    }
  }

  private formatPhoneNumber(phone: string): string {
    const { formatBrazilianWhatsAppNumber } = require('../phoneFormatter');
    return formatBrazilianWhatsAppNumber(phone);
  }

  private getMediaTypeFromUrl(url: string): MediaType {
    const ext = path.extname(url).toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      return 'image';
    } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
      return 'video';
    } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
      return 'audio';
    } else {
      return 'document';
    }
  }

  private async updateSessionInDB(sessionId: string, updates: any): Promise<void> {
    try {
      const session = await storage.getSessionBySessionId(sessionId);
      if (session) {
        await storage.updateSession(session.id, updates);
      }
    } catch (error) {
      console.error('Failed to update session in DB:', error);
    }
  }

  private async createLog(sessionId: string, level: string, message: string): Promise<void> {
    try {
      const session = await storage.getSessionBySessionId(sessionId);
      await storage.createLog({
        level,
        message,
        sessionId: session?.id,
        userId: session?.userId,
      });
    } catch (error) {
      console.error('Failed to create log:', error);
    }
  }

  // Get all active sessions
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys()).filter(sessionId => {
      const session = this.sessions.get(sessionId);
      return session?.isConnected;
    });
  }

  // Check if session is connected
  isSessionConnected(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.isConnected || false;
  }
}

export const whatsappService = new WhatsAppService();
