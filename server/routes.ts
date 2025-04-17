import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertChatbotSchema, insertDocumentSchema, insertMessageSchema, behaviorRuleSchema } from "@shared/schema";
import { generateCompletion, processDocumentText } from "./openai";
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
    // Accept pdf, docx, and txt
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "text/plain"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOCX, and TXT are allowed."));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);
  return httpServer;
}
