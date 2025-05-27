import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { sessionManager } from "./whatsapp/sessionManager";
import { messageService } from "./services/messageService";
import { campaignService } from "./services/campaignService";
import { scheduleService } from "./services/scheduleService";
import { upload } from "./middleware/upload";
import { insertSessionSchema, insertMessageSchema, insertCampaignSchema, insertBirthdaySchema } from "@shared/schema";
import { z } from "zod";
import csv from "csv-parser";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Create WebSocket server on a different path to avoid conflicts with Vite
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/api/ws'
  });

  // WebSocket for real-time updates
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Handle WebSocket messages if needed
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });

    ws.on('error', (error) => {
      console.log('WebSocket error:', error);
    });
  });

  // Broadcast function for real-time updates
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(JSON.stringify(data));
        } catch (error) {
          console.log('Error broadcasting message:', error);
        }
      }
    });
  };

  // Set broadcast function in services
  messageService.setBroadcast(broadcast);
  if (sessionManager && sessionManager.setBroadcast) {
    sessionManager.setBroadcast(broadcast);
  }

  // API Routes

  // Dashboard stats
  app.get("/api/stats", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // Reports endpoints
  app.get("/api/reports/overview", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const range = req.query.range as string || '7d';
      const overview = await storage.getReportsOverview(userId, range);
      res.json(overview);
    } catch (error) {
      console.error('Reports overview error:', error);
      res.status(500).json({ error: "Failed to get reports overview" });
    }
  });

  app.get("/api/reports/chart", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const range = req.query.range as string || '7d';
      const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : undefined;
      const chartData = await storage.getReportsChart(userId, range, sessionId);
      res.json(chartData);
    } catch (error) {
      console.error('Reports chart error:', error);
      res.status(500).json({ error: "Failed to get chart data" });
    }
  });

  app.get("/api/reports/sessions", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const range = req.query.range as string || '7d';
      const sessionStats = await storage.getReportsSessionStats(userId, range);
      res.json(sessionStats);
    } catch (error) {
      console.error('Session stats error:', error);
      res.status(500).json({ error: "Failed to get session stats" });
    }
  });

  app.get("/api/reports/campaigns", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const range = req.query.range as string || '7d';
      const campaignStats = await storage.getReportsCampaignStats(userId, range);
      res.json(campaignStats);
    } catch (error) {
      console.error('Campaign stats error:', error);
      res.status(500).json({ error: "Failed to get campaign stats" });
    }
  });

  app.get("/api/reports/export", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const range = req.query.range as string || '7d';
      const format = req.query.format as string || 'csv';
      const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : undefined;
      
      const exportData = await storage.getReportsExport(userId, range, sessionId);
      
      if (format === 'csv') {
        const csvHeader = 'Date,Sent,Delivered,Failed,Success Rate\n';
        const csvContent = exportData.map((row: any) => 
          `${row.date},${row.sent},${row.delivered},${row.failed},${row.successRate}`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="whatsapp-report-${range}.csv"`);
        res.send(csvHeader + csvContent);
      } else {
        // For PDF, you would need a PDF library like puppeteer or jsPDF
        res.status(501).json({ error: "PDF export not implemented yet" });
      }
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: "Failed to export report" });
    }
  });

  // Sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const sessions = await storage.getSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get sessions" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const data = insertSessionSchema.parse({
        ...req.body,
        userId: 1 // TODO: Get from session/auth
      });
      
      const session = await storage.createSession(data);
      
      // Initialize WhatsApp session
      const qrCode = await sessionManager.createSession(session.sessionId, session.name);
      
      if (qrCode) {
        await storage.updateSession(session.id, { qrCode, status: 'qr_needed' });
      }
      
      const updatedSession = await storage.getSession(session.id);
      res.json(updatedSession);
    } catch (error) {
      console.error('Session creation error:', error);
      res.status(400).json({ error: "Failed to create session" });
    }
  });

  app.put("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const session = await storage.updateSession(id, updates);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = await storage.getSession(id);
      
      if (session) {
        await sessionManager.deleteSession(session.sessionId);
        await storage.deleteSession(id);
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  app.post("/api/sessions/:id/reconnect", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = await storage.getSession(id);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const qrCode = await sessionManager.reconnectSession(session.sessionId);
      
      if (qrCode) {
        await storage.updateSession(id, { qrCode, status: 'qr_needed' });
      }
      
      const updatedSession = await storage.getSession(id);
      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ error: "Failed to reconnect session" });
    }
  });

  // Messages
  app.get("/api/messages", async (req, res) => {
    try {
      const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      const messages = await storage.getMessages(sessionId, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/messages/send", async (req, res) => {
    try {
      const { sessionId, phones, content, type = 'text', mediaUrl, scheduledAt } = req.body;
      
      // Validate phones array
      if (!Array.isArray(phones) || phones.length === 0) {
        return res.status(400).json({ error: "Phones array is required" });
      }
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Create message records
      const messages = [];
      for (const phone of phones) {
        const messageData = insertMessageSchema.parse({
          sessionId,
          type,
          content,
          mediaUrl,
          phone,
          status: 'pending',
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null
        });
        
        const message = await storage.createMessage(messageData);
        messages.push(message);
      }
      
      // Send immediately if not scheduled
      if (!scheduledAt) {
        for (const message of messages) {
          messageService.queueMessage(message);
        }
      }
      
      res.json({ messages, queued: messages.length });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(400).json({ error: "Failed to send messages" });
    }
  });

  app.post("/api/messages/quick-send", async (req, res) => {
    try {
      const { phone, content, sessionId } = req.body;
      
      // Parse phone numbers (comma-separated)
      const phones = phone.split(',').map((p: string) => p.trim()).filter((p: string) => p);
      
      if (phones.length === 0) {
        return res.status(400).json({ error: "No valid phone numbers provided" });
      }
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Create and queue messages
      const messages = [];
      for (const phoneNumber of phones) {
        const messageData = insertMessageSchema.parse({
          sessionId,
          type: 'text',
          content,
          phone: phoneNumber,
          status: 'pending'
        });
        
        const message = await storage.createMessage(messageData);
        messages.push(message);
        messageService.queueMessage(message);
      }
      
      res.json({ success: true, queued: messages.length });
    } catch (error) {
      console.error('Quick send error:', error);
      res.status(400).json({ error: "Failed to send message" });
    }
  });

  // Scheduled Messages
  app.get("/api/messages/scheduled", async (req, res) => {
    try {
      const messages = await storage.getPendingScheduledMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get scheduled messages" });
    }
  });

  app.post("/api/messages/schedule", async (req, res) => {
    try {
      const { sessionId, phone, content, scheduledAt, type = 'text' } = req.body;
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const messageData = insertMessageSchema.parse({
        sessionId,
        type,
        content,
        phone,
        status: 'pending',
        scheduledAt: new Date(scheduledAt)
      });
      
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error('Schedule message error:', error);
      res.status(400).json({ error: "Failed to schedule message" });
    }
  });

  app.delete("/api/messages/scheduled/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateMessage(id, { status: 'cancelled' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel scheduled message" });
    }
  });

  // CSV Upload
  app.post("/api/contacts/upload", upload.single('csv'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "CSV file is required" });
      }
      
      const userId = 1; // TODO: Get from session/auth
      const contacts: any[] = [];
      
      // Parse CSV
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (row) => {
            if (row.phone || row.telefone || row.number) {
              contacts.push({
                userId,
                phone: row.phone || row.telefone || row.number,
                name: row.name || row.nome || '',
                email: row.email || '',
                isActive: true
              });
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });
      
      // Save contacts to database
      if (contacts.length > 0) {
        await storage.createContacts(contacts);
      }
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      res.json({ imported: contacts.length });
    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({ error: "Failed to process CSV" });
    }
  });

  app.get("/api/contacts", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const contacts = await storage.getContacts(userId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get contacts" });
    }
  });

  // Campaigns
  app.get("/api/campaigns", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const campaigns = await storage.getCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to get campaigns" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const data = insertCampaignSchema.parse({
        ...req.body,
        userId: 1 // TODO: Get from session/auth
      });
      
      const campaign = await storage.createCampaign(data);
      res.json(campaign);
    } catch (error) {
      console.error('Campaign creation error:', error);
      res.status(400).json({ error: "Failed to create campaign" });
    }
  });

  app.put("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const campaign = await storage.updateCampaign(id, updates);
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  app.post("/api/campaigns/:id/start", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getCampaign(id);
      
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      await campaignService.startCampaign(campaign);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to start campaign" });
    }
  });

  // Birthday campaigns
  app.get("/api/birthdays", async (req, res) => {
    try {
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
      const birthdays = await storage.getBirthdays(campaignId);
      res.json(birthdays);
    } catch (error) {
      res.status(500).json({ error: "Failed to get birthdays" });
    }
  });

  app.post("/api/birthdays", async (req, res) => {
    try {
      const data = insertBirthdaySchema.parse(req.body);
      const birthday = await storage.createBirthday(data);
      res.json(birthday);
    } catch (error) {
      res.status(400).json({ error: "Failed to create birthday" });
    }
  });

  app.post("/api/birthdays/upload", upload.single('csv'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "CSV file is required" });
      }
      
      const { campaignId } = req.body;
      const birthdays = [];
      
      // Parse CSV
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file!.path)
          .pipe(csv())
          .on('data', (row) => {
            if ((row.phone || row.telefone) && (row.birthDate || row.aniversario || row.nascimento)) {
              const birthDate = row.birthDate || row.aniversario || row.nascimento;
              // Convert to MM-DD format
              const date = new Date(birthDate);
              const formattedDate = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
              
              birthdays.push({
                campaignId: campaignId ? parseInt(campaignId) : null,
                phone: row.phone || row.telefone,
                name: row.name || row.nome || '',
                birthDate: formattedDate,
                year: date.getFullYear(),
                isActive: true
              });
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });
      
      // Save birthdays to database
      for (const birthday of birthdays) {
        await storage.createBirthday(birthday);
      }
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      res.json({ imported: birthdays.length });
    } catch (error) {
      console.error('Birthday CSV upload error:', error);
      res.status(500).json({ error: "Failed to process birthday CSV" });
    }
  });

  // Groups
  app.get("/api/groups", async (req, res) => {
    try {
      const sessionId = parseInt(req.query.sessionId as string);
      const groups = await storage.getGroups(sessionId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: "Failed to get groups" });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const { sessionId, name, description, members } = req.body;
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Create group via WhatsApp
      const groupId = await sessionManager.createGroup(session.sessionId, name, members);
      
      if (groupId) {
        const group = await storage.createGroup({
          sessionId,
          groupId,
          name,
          description,
          memberCount: members.length
        });
        
        res.json(group);
      } else {
        res.status(500).json({ error: "Failed to create WhatsApp group" });
      }
    } catch (error) {
      console.error('Group creation error:', error);
      res.status(400).json({ error: "Failed to create group" });
    }
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Logs
  app.get("/api/logs", async (req, res) => {
    try {
      const filters = {
        level: req.query.level as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100
      };
      
      const logs = await storage.getLogs(filters);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get logs" });
    }
  });

  // Groups endpoints
  app.get("/api/groups", async (req, res) => {
    try {
      const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : 2; // Default to first session
      const groups = await storage.getGroups(sessionId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: "Failed to get groups" });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const { sessionId, name, description, members } = req.body;
      
      // Create group via WhatsApp
      const groupId = await sessionManager.createGroup(sessionId, name, members || []);
      
      if (groupId) {
        // Save to database
        const group = await storage.createGroup({
          sessionId: parseInt(sessionId),
          groupId,
          name,
          description: description || '',
          memberCount: members?.length || 0,
          isActive: true
        });
        res.json(group);
      } else {
        res.status(400).json({ error: "Failed to create WhatsApp group" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  // Scheduled messages endpoints
  app.get("/api/scheduled", async (req, res) => {
    try {
      const scheduledMessages = await storage.getPendingScheduledMessages();
      res.json(scheduledMessages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get scheduled messages" });
    }
  });

  // Initialize cron jobs for scheduled tasks
  scheduleService.initializeCronJobs();

  return httpServer;
}
