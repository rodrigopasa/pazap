import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sessionManager } from "./whatsapp/sessionManager";
import { messageService } from "./services/messageService";
import { campaignService } from "./services/campaignService";
import { insertSessionSchema, insertMessageSchema, insertCampaignSchema, insertBirthdaySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

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

  // Reports
  app.get("/api/reports/overview", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from session/auth
      const range = req.query.range as string || '7d';
      const overview = await storage.getReportsOverview(userId, range);
      res.json(overview);
    } catch (error) {
      res.status(500).json({ error: "Failed to get reports overview" });
    }
  });

  return httpServer;
}