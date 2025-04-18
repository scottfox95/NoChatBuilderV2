import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertChatbotSchema, insertDocumentSchema, insertMessageSchema, behaviorRuleSchema } from "@shared/schema";
import { generateCompletion, processDocumentText, verifyApiKey } from "./openai";
import { redactMessagesPII, redactPII } from "./redaction";
import multer from "multer";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(import.meta.dirname, "../uploads");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept pdf, docx, txt, and rtf
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "text/plain" ||
      file.mimetype === "application/rtf" ||
      file.mimetype === "text/rtf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOCX, TXT, and RTF are allowed."));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve widget.js static file
  app.get("/widget.js", (req, res) => {
    const widgetPath = path.join(process.cwd(), "client", "public", "widget.js");
    if (fs.existsSync(widgetPath)) {
      res.setHeader("Content-Type", "application/javascript");
      res.sendFile(widgetPath);
    } else {
      res.status(404).send("Widget file not found");
    }
  });
  // Set up authentication routes
  setupAuth(app);

  // Chatbot routes
  app.get("/api/chatbots", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const chatbots = await storage.getChatbots(req.user.id);
    res.json(chatbots);
  });

  app.post("/api/chatbots", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Add the current user's ID to the request data
      console.log("Creating chatbot with user ID:", req.user.id);
      const data = insertChatbotSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      // Check for duplicate slug
      const existingChatbot = await storage.getChatbotBySlug(data.slug);
      if (existingChatbot) {
        return res.status(400).json({ message: "A chatbot with this slug already exists" });
      }

      const chatbot = await storage.createChatbot(data);
      res.status(201).json(chatbot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create chatbot" });
    }
  });

  app.get("/api/chatbots/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const chatbot = await storage.getChatbot(Number(req.params.id));
    if (!chatbot) {
      return res.status(404).json({ message: "Chatbot not found" });
    }
    
    if (chatbot.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to access this chatbot" });
    }
    
    res.json(chatbot);
  });

  app.put("/api/chatbots/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const chatbot = await storage.getChatbot(Number(req.params.id));
      if (!chatbot) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      
      if (chatbot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this chatbot" });
      }

      // If slug is being updated, check for duplicates
      if (req.body.slug && req.body.slug !== chatbot.slug) {
        const existingChatbot = await storage.getChatbotBySlug(req.body.slug);
        if (existingChatbot && existingChatbot.id !== chatbot.id) {
          return res.status(400).json({ message: "A chatbot with this slug already exists" });
        }
      }

      const validatedData = insertChatbotSchema.partial().parse(req.body);
      const updatedChatbot = await storage.updateChatbot(Number(req.params.id), validatedData);
      res.json(updatedChatbot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update chatbot" });
    }
  });

  app.post("/api/chatbots/:id/duplicate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sourceChatbotId = Number(req.params.id);
      const sourceChatbot = await storage.getChatbot(sourceChatbotId);
      
      if (!sourceChatbot) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      
      if (sourceChatbot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to duplicate this chatbot" });
      }
      
      // Create a copy with a new slug and name
      const timestamp = Date.now().toString().slice(-4);
      
      // Create a new chatbot with copied properties
      // Make sure to properly handle the JSON fields
      const createdChatbot = await storage.createChatbot({
        userId: req.user.id,
        name: `${sourceChatbot.name} (Copy)`,
        slug: `${sourceChatbot.slug}-copy-${timestamp}`,
        description: sourceChatbot.description,
        systemPrompt: sourceChatbot.systemPrompt,
        model: sourceChatbot.model,
        temperature: sourceChatbot.temperature,
        maxTokens: sourceChatbot.maxTokens,
        ragEnabled: sourceChatbot.ragEnabled,
        fallbackResponse: sourceChatbot.fallbackResponse,
        // Make sure behaviorRules is a proper JSON array
        behaviorRules: Array.isArray(sourceChatbot.behaviorRules) ? sourceChatbot.behaviorRules : [],
        welcomeMessage: sourceChatbot.welcomeMessage,
        // Make sure welcomeMessages is a proper JSON array
        welcomeMessages: Array.isArray(sourceChatbot.welcomeMessages) ? sourceChatbot.welcomeMessages : 
          [sourceChatbot.welcomeMessage || "Hello! How can I assist you today?"],
        // Make sure suggestedQuestions is a proper array
        suggestedQuestions: Array.isArray(sourceChatbot.suggestedQuestions) ? sourceChatbot.suggestedQuestions : []
      });
      
      // As per the requirement, we don't duplicate the documents in the knowledge base
      // The new chatbot will start with an empty knowledge base
      
      res.status(201).json(createdChatbot);
    } catch (error) {
      console.error("Error duplicating chatbot:", error);
      res.status(500).json({ message: "Failed to duplicate chatbot" });
    }
  });

  app.delete("/api/chatbots/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const chatbot = await storage.getChatbot(Number(req.params.id));
    if (!chatbot) {
      return res.status(404).json({ message: "Chatbot not found" });
    }
    
    if (chatbot.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this chatbot" });
    }
    
    await storage.deleteChatbot(Number(req.params.id));
    res.status(204).send();
  });

  // Document routes
  app.get("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const documents = await storage.getAllDocuments(req.user.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching all documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/chatbots/:id/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const chatbot = await storage.getChatbot(Number(req.params.id));
    if (!chatbot) {
      return res.status(404).json({ message: "Chatbot not found" });
    }
    
    if (chatbot.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to access this chatbot's documents" });
    }
    
    const documents = await storage.getDocumentsByChatbotId(Number(req.params.id));
    res.json(documents);
  });

  app.post("/api/chatbots/:id/documents", upload.single("file"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const chatbot = await storage.getChatbot(Number(req.params.id));
      if (!chatbot) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      
      if (chatbot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to add documents to this chatbot" });
      }

      // Get file type from the upload
      const fileType = path.extname(req.file.originalname).substring(1).toLowerCase();
      
      // Read and process the file
      const fileContent = await readFile(req.file.path, "utf8");
      const processedContent = await processDocumentText(fileContent, fileType);
      
      // Create document record
      const document = await storage.createDocument({
        chatbotId: Number(req.params.id),
        name: req.file.originalname,
        type: fileType,
        content: processedContent,
        size: req.file.size,
      });
      
      // Clean up the file
      await unlink(req.file.path);
      
      res.status(201).json(document);
    } catch (error) {
      // Clean up uploaded file if there was an error
      if (req.file) {
        try {
          await unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Error deleting file:", unlinkError);
        }
      }

      console.error("Document upload error:", error);
      res.status(500).json({ message: "Failed to process document" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    // Make sure the document belongs to a chatbot owned by the user
    const documents = await storage.getDocumentsByChatbotId(Number(req.params.id));
    const document = documents.find(doc => doc.id === Number(req.params.id));
    
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    const chatbot = await storage.getChatbot(document.chatbotId);
    if (!chatbot || chatbot.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this document" });
    }
    
    await storage.deleteDocument(Number(req.params.id));
    res.status(204).send();
  });

  // Public chatbot access
  app.get("/api/public/chatbot/:slug", async (req, res) => {
    const chatbot = await storage.getChatbotBySlug(req.params.slug);
    if (!chatbot) {
      return res.status(404).json({ message: "Chatbot not found" });
    }
    
    // Increment view count
    await storage.incrementChatbotViews(chatbot.id);
    
    // Return public chatbot info
    res.json({
      id: chatbot.id,
      name: chatbot.name,
      description: chatbot.description,
      model: chatbot.model,
      welcomeMessage: chatbot.welcomeMessage || "Hello! How can I assist you today?",
      welcomeMessages: chatbot.welcomeMessages || [chatbot.welcomeMessage || "Hello! How can I assist you today?"],
      suggestedQuestions: chatbot.suggestedQuestions || [],
    });
  });

  // Chat messages
  app.post("/api/public/chatbot/:slug/messages", async (req, res) => {
    const chatbot = await storage.getChatbotBySlug(req.params.slug);
    if (!chatbot) {
      return res.status(404).json({ message: "Chatbot not found" });
    }

    try {
      // Create or use existing session ID
      const sessionId = req.body.sessionId || nanoid();
      
      // Validate user message
      const userMessage = req.body.message;
      if (!userMessage || typeof userMessage !== "string") {
        return res.status(400).json({ message: "Invalid message" });
      }

      // Get previous messages in this session
      const previousMessages = await storage.getMessagesBySession(chatbot.id, sessionId);
      
      // Store user message
      await storage.createMessage({
        chatbotId: chatbot.id,
        sessionId,
        isUser: true,
        content: userMessage,
      });

      // Check behavior rules
      let responseContent = "";
      const behaviorRules = chatbot.behaviorRules as z.infer<typeof behaviorRuleSchema>[];
      
      for (const rule of behaviorRules) {
        // Simple condition checking (in a real app, this would be more sophisticated)
        if (userMessage.toLowerCase().includes(rule.condition.toLowerCase())) {
          responseContent = rule.response;
          break;
        }
      }

      // If no behavior rule matched, use OpenAI to generate a response
      if (!responseContent) {
        try {
          // Get documents for RAG if enabled
          let documents: string[] = [];
          if (chatbot.ragEnabled) {
            const docs = await storage.getDocumentsByChatbotId(chatbot.id);
            documents = docs.map(doc => doc.content);
          }

          // Generate completion using OpenAI
          responseContent = await generateCompletion({
            model: chatbot.model,
            systemPrompt: chatbot.systemPrompt,
            userMessage,
            previousMessages: previousMessages.map(msg => ({
              role: msg.isUser ? "user" : "assistant",
              content: msg.content,
            })),
            temperature: chatbot.temperature / 100,
            maxTokens: chatbot.maxTokens,
            documents,
            fallbackResponse: chatbot.fallbackResponse,
          });
        } catch (error) {
          console.error("OpenAI error:", error);
          responseContent = chatbot.fallbackResponse || "I'm sorry, I couldn't process your request at this time.";
        }
      }

      // Store bot response
      const botMessage = await storage.createMessage({
        chatbotId: chatbot.id,
        sessionId,
        isUser: false,
        content: responseContent,
      });

      res.json({
        message: botMessage,
        sessionId,
      });
    } catch (error) {
      console.error("Chat message error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  app.get("/api/public/chatbot/:slug/messages/:sessionId", async (req, res) => {
    const chatbot = await storage.getChatbotBySlug(req.params.slug);
    if (!chatbot) {
      return res.status(404).json({ message: "Chatbot not found" });
    }

    const messages = await storage.getMessagesBySession(
      chatbot.id,
      req.params.sessionId
    );
    
    res.json(messages);
  });
  
  // Chat logs with filtering
  app.get("/api/logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const chatbotId = req.query.chatbotId as string;
      const search = req.query.search as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Get all chatbots owned by the user to ensure they only see messages from their chatbots
      const userChatbots = await storage.getChatbots(req.user.id);
      const userChatbotIds = userChatbots.map(c => c.id);
      
      // Create filter object for the query
      const filter: any = {
        userId: req.user.id,
        chatbotIds: userChatbotIds
      };
      
      // Add optional filters
      if (chatbotId && chatbotId !== "all") {
        // Make sure user owns this chatbot
        const chatbotIdNum = parseInt(chatbotId);
        if (userChatbotIds.includes(chatbotIdNum)) {
          filter.chatbotId = chatbotIdNum;
        }
      }
      
      if (search) {
        filter.search = search;
      }
      
      if (startDate) {
        filter.startDate = new Date(startDate);
      }
      
      if (endDate) {
        // Add one day to make the end date inclusive
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        filter.endDate = endDateObj;
      }
      
      // Get messages with pagination
      const { logs, totalCount } = await storage.getChatLogs(filter, page, pageSize);
      
      // Enhance logs with chatbot name
      const enhancedLogs = await Promise.all(logs.map(async (log) => {
        const chatbot = userChatbots.find(c => c.id === log.chatbotId);
        return {
          ...log,
          chatbotName: chatbot ? chatbot.name : "Unknown Chatbot"
        };
      }));
      
      res.json({ 
        logs: enhancedLogs, 
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      });
    } catch (error) {
      console.error("Error fetching chat logs:", error);
      res.status(500).json({ message: "Failed to fetch chat logs" });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Get query parameters
      const chatbotId = req.query.chatbotId as string;
      const timeframe = req.query.timeframe as string || 'all';
      
      // Get all chatbots owned by the user
      const userChatbots = await storage.getChatbots(req.user.id);
      const userChatbotIds = userChatbots.map(c => c.id);
      
      if (userChatbotIds.length === 0) {
        return res.json({ 
          overallStats: {
            totalSessions: 0,
            totalQueries: 0,
            averageQueriesPerSession: 0,
            chatbotBreakdown: []
          },
          careAidStats: []
        });
      }
      
      // Prepare filter for time range
      const timeFilter: any = {};
      
      if (timeframe !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        if (timeframe === 'today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (timeframe === 'week') {
          startDate.setDate(startDate.getDate() - 7);
        } else if (timeframe === 'month') {
          startDate.setDate(startDate.getDate() - 30);
        }
        
        timeFilter.startDate = startDate;
        timeFilter.endDate = now;
      }
      
      // Get analytics for specific chatbot or all chatbots
      if (chatbotId && chatbotId !== 'all') {
        const chatbotIdNum = parseInt(chatbotId);
        // Ensure the user owns this chatbot
        if (!userChatbotIds.includes(chatbotIdNum)) {
          return res.status(403).json({ message: "Not authorized to access this chatbot's analytics" });
        }
        
        // Get sessions and queries for the specific chatbot
        const chatbotStats = await storage.getChatbotAnalytics(chatbotIdNum, timeFilter);
        const chatbot = userChatbots.find(c => c.id === chatbotIdNum);
        
        res.json({
          overallStats: {
            totalSessions: chatbotStats.totalSessions,
            totalQueries: chatbotStats.totalQueries,
            averageQueriesPerSession: chatbotStats.totalSessions > 0 
              ? chatbotStats.totalQueries / chatbotStats.totalSessions 
              : 0,
            chatbotBreakdown: [{
              chatbotId: chatbotIdNum,
              chatbotName: chatbot?.name || "Unknown",
              sessions: chatbotStats.totalSessions,
              queries: chatbotStats.totalQueries
            }]
          },
          careAidStats: [{
            chatbotId: chatbotIdNum,
            chatbotName: chatbot?.name || "Unknown",
            totalSessions: chatbotStats.totalSessions,
            totalQueries: chatbotStats.totalQueries,
            averageQueriesPerSession: chatbotStats.totalSessions > 0 
              ? chatbotStats.totalQueries / chatbotStats.totalSessions 
              : 0
          }]
        });
      } else {
        // Get overall analytics for all user's chatbots
        const overallStats = await storage.getOverallAnalytics(userChatbotIds, timeFilter);
        
        // Get individual chatbot analytics
        const chatbotStats = await Promise.all(
          userChatbots.map(async (chatbot) => {
            const stats = await storage.getChatbotAnalytics(chatbot.id, timeFilter);
            return {
              chatbotId: chatbot.id,
              chatbotName: chatbot.name,
              totalSessions: stats.totalSessions,
              totalQueries: stats.totalQueries,
              averageQueriesPerSession: stats.totalSessions > 0 
                ? stats.totalQueries / stats.totalSessions 
                : 0
            };
          })
        );
        
        // Create breakdown for pie chart
        const chatbotBreakdown = chatbotStats.map(stat => ({
          chatbotId: stat.chatbotId,
          chatbotName: stat.chatbotName,
          sessions: stat.totalSessions,
          queries: stat.totalQueries
        }));
        
        res.json({
          overallStats: {
            totalSessions: overallStats.totalSessions,
            totalQueries: overallStats.totalQueries,
            averageQueriesPerSession: overallStats.totalSessions > 0 
              ? overallStats.totalQueries / overallStats.totalSessions 
              : 0,
            chatbotBreakdown
          },
          careAidStats: chatbotStats
        });
      }
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  // Preview mode response generation endpoint
  app.post("/api/preview/generate-response", async (req, res) => {
    try {
      const { message, systemPrompt } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Generate response using OpenAI
      const response = await generateCompletion({
        model: "gpt35turbo", // Use default model for preview
        systemPrompt: systemPrompt || "You are a helpful AI assistant.",
        userMessage: message,
        previousMessages: [], // No history in preview mode
        temperature: 0.7,
        maxTokens: 500,
        documents: [], // No documents in preview mode
      });

      res.json({ response });
    } catch (error) {
      console.error("Preview response error:", error);
      res.status(500).json({ message: "Failed to generate preview response" });
    }
  });
  
  // Settings routes
  app.get("/api/settings/openai", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const apiKeyStatus = await verifyApiKey();
      res.json(apiKeyStatus);
    } catch (error) {
      console.error("Error checking OpenAI API key:", error);
      res.status(500).json({ 
        valid: false, 
        message: "Error checking API key status"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
