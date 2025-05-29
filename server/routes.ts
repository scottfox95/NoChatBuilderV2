import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertChatbotSchema, insertDocumentSchema, insertMessageSchema, behaviorRuleSchema, insertUserChatbotAssignmentSchema, insertUserSchema, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateCompletion, generateStreamingCompletion, generateStreamingAssistantCompletion, processDocumentText, verifyApiKey } from "./openai";
import OpenAI from "openai";
import { redactMessagesPII, redactPII } from "./redaction";
import multer from "multer";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

// Initialize OpenAI client for vector store operations
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

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
  // Ensure API routes always return JSON, not HTML
  app.use("/api/*", (req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    next();
  });

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
    
    // Admin users can see all chatbots, others only see their own
    let chatbots;
    if (req.user.role === "admin") {
      chatbots = await storage.getAllChatbots();
    } else {
      chatbots = await storage.getChatbots(req.user.id);
    }
    res.json(chatbots);
  });

  app.post("/api/chatbots", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Add the current user's ID to the request data
      console.log("Creating chatbot with user ID:", req.user.id);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      
      const data = insertChatbotSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      console.log("Parsed chatbot data:", JSON.stringify(data, null, 2));
      
      // Check for duplicate slug
      const existingChatbot = await storage.getChatbotBySlug(data.slug);
      if (existingChatbot) {
        return res.status(400).json({ message: "A chatbot with this slug already exists" });
      }

      const chatbot = await storage.createChatbot(data);
      console.log("Created chatbot successfully:", chatbot.id);
      
      // Create a private vector store for this chatbot
      try {
        const vectorStore = await openai.vectorStores.create({
          name: `aidify-bot-${chatbot.id}`,
        });
        
        // Update the chatbot with the vector store ID
        await storage.updateChatbot(chatbot.id, { vectorStoreId: vectorStore.id });
        console.log("Created vector store:", vectorStore.id, "for chatbot:", chatbot.id);
        
        // Return the updated chatbot with vector store ID
        const updatedChatbot = await storage.getChatbot(chatbot.id);
        res.status(201).json(updatedChatbot);
      } catch (error) {
        console.error("Error creating vector store:", error);
        // Even if vector store creation fails, we still return the chatbot
        // The vector store can be created later
        res.status(201).json(chatbot);
      }
    } catch (error) {
      console.error("Error creating chatbot:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create chatbot", error: error.message });
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
    if (!(req as any).file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const chatbot = await storage.getChatbot(Number(req.params.id));
      if (!chatbot) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      
      if (chatbot.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to add documents to this chatbot" });
      }

      const file = (req as any).file;
      
      // Get file type from the upload
      const fileType = path.extname(file.originalname).substring(1).toLowerCase();
      
      let openaiFileId = null;
      
      // If chatbot has a vector store, upload to OpenAI
      if (chatbot.vectorStoreId) {
        try {
          // 1. Upload raw file to OpenAI
          const uploadResponse = await openai.files.create({
            file: fs.createReadStream(file.path),
            purpose: "assistants",
          });
          
          openaiFileId = uploadResponse.id;
          console.log("Uploaded file to OpenAI:", openaiFileId);
          
          // 2. Add file to the chatbot's vector store
          await openai.vectorStores.fileBatches.create(
            chatbot.vectorStoreId,
            { file_ids: [uploadResponse.id] }
          );
          
          console.log("Added file to vector store:", chatbot.vectorStoreId);
        } catch (error) {
          console.error("Error uploading to OpenAI vector store:", error);
          // Continue with local storage even if OpenAI upload fails
        }
      }
      
      // Read and process the file for local storage
      const fileContent = await readFile(file.path, "utf8");
      const processedContent = await processDocumentText(fileContent, fileType);
      
      // 3. Create document record with OpenAI file ID
      const document = await storage.createDocument({
        chatbotId: Number(req.params.id),
        name: file.originalname,
        type: fileType,
        content: processedContent,
        size: file.size,
        openaiFileId: openaiFileId,
      });
      
      // Clean up the local file
      await unlink(file.path);
      
      res.status(201).json(document);
    } catch (error) {
      // Clean up uploaded file if there was an error
      if ((req as any).file) {
        try {
          await unlink((req as any).file.path);
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

  // Chat messages - regular endpoint
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

      // Check if this is preparation for streaming mode
      const streamMode = req.body.stream === true;
      if (streamMode) {
        // For streaming mode, just create an empty message and return its ID
        // The actual streaming will happen in the /stream endpoint
        const initialBotMessage = await storage.createMessage({
          chatbotId: chatbot.id,
          sessionId,
          isUser: false,
          content: "",
        });
        
        return res.json({
          message: initialBotMessage,
          sessionId,
        });
      }

      // For non-streaming responses
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
  
  // Streaming endpoint for SSE
  app.get("/api/public/chatbot/:slug/stream", async (req, res) => {
    try {
      const chatbot = await storage.getChatbotBySlug(req.params.slug);
      if (!chatbot) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      
      // Get parameters from query string
      const sessionId = req.query.sessionId as string;
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }
      
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Helper function to send SSE events
      const sendEvent = (eventType: string, data: any) => {
        res.write(`event: ${eventType}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };
      
      // Send initial event with session info
      sendEvent('session', { sessionId });
      
      // Get the most recent messages from the session
      const messages = await storage.getMessagesBySession(chatbot.id, sessionId);
      
      if (messages.length < 2) {
        sendEvent('error', { message: "No conversation found" });
        return res.end();
      }
      
      // Find the latest user message and the empty bot message that will be updated
      const userMessages = messages.filter(m => m.isUser);
      const botMessages = messages.filter(m => !m.isUser);
      
      if (userMessages.length === 0 || botMessages.length === 0) {
        sendEvent('error', { message: "Invalid conversation state" });
        return res.end();
      }
      
      const latestUserMessage = userMessages[userMessages.length - 1];
      const latestBotMessage = botMessages[botMessages.length - 1];
      
      // Get only previous messages for context (excluding the latest pair)
      const previousMessages = messages.slice(0, -2).map(msg => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.content,
      }));
      
      // Prepare for streaming
      let documents: string[] = [];
      if (chatbot.ragEnabled) {
        const docs = await storage.getDocumentsByChatbotId(chatbot.id);
        documents = docs.map(doc => doc.content);
      }
      
      let fullContent = "";
      
      try {
        // Use vector store if available, otherwise fall back to traditional RAG
        if (chatbot.vectorStoreId) {
          // Stream the completion with vector store support
          await generateStreamingAssistantCompletion({
            model: chatbot.model,
            systemPrompt: chatbot.systemPrompt,
            userMessage: latestUserMessage.content,
            previousMessages: previousMessages as any[],
            vectorStoreId: chatbot.vectorStoreId,
            temperature: chatbot.temperature / 100,
            maxTokens: chatbot.maxTokens,
            fallbackResponse: chatbot.fallbackResponse || undefined,
            onChunk: (chunk) => {
              // Send each chunk as it arrives
              sendEvent('chunk', { content: chunk });
            },
            onComplete: async (completedContent) => {
              fullContent = completedContent;
              
              // Update the message in the database with the final content
              const updatedMessage = await storage.updateMessage(latestBotMessage.id, {
                content: fullContent
              });
            
            // Send the complete event with the final message
            sendEvent('complete', { 
              message: {
                ...latestBotMessage,
                content: fullContent
              }
            });
            
            // End the response
            res.end();
          },
          onError: async (error) => {
            console.error("Streaming error:", error);
            
            const errorMsg = typeof error === 'string' ? error : 
              chatbot.fallbackResponse || "I'm sorry, I couldn't process your request at this time.";
            
            // Update the message in the database with the error message
            await storage.updateMessage(latestBotMessage.id, {
              content: errorMsg
            });
            
            // Send error event
            sendEvent('error', { message: errorMsg });
            
            // End the response
            res.end();
          }
        });
      } else {
          // Fall back to traditional RAG for chatbots without vector stores
          await generateStreamingCompletion({
            model: chatbot.model,
            systemPrompt: chatbot.systemPrompt,
            userMessage: latestUserMessage.content,
            previousMessages: previousMessages,
            temperature: chatbot.temperature / 100,
            maxTokens: chatbot.maxTokens,
            documents,
            fallbackResponse: chatbot.fallbackResponse,
            onChunk: (chunk) => {
              sendEvent('chunk', { content: chunk });
            },
            onComplete: async (completedContent) => {
              fullContent = completedContent;
              
              const updatedMessage = await storage.updateMessage(latestBotMessage.id, {
                content: fullContent
              });
            
              sendEvent('complete', { 
                message: {
                  ...latestBotMessage,
                  content: fullContent
                }
              });
              
              res.end();
            },
            onError: async (error) => {
              console.error("Streaming error:", error);
              
              const errorMsg = typeof error === 'string' ? error : 
                chatbot.fallbackResponse || "I'm sorry, I couldn't process your request at this time.";
              
              await storage.updateMessage(latestBotMessage.id, {
                content: errorMsg
              });
              
              sendEvent('error', { message: errorMsg });
              res.end();
            }
          });
        }
      } catch (error) {
        console.error("OpenAI streaming error:", error);
        const errorMsg = chatbot.fallbackResponse || "I'm sorry, I couldn't process your request at this time.";
        
        // Update the message with the error content
        await storage.updateMessage(latestBotMessage.id, {
          content: errorMsg
        });
        
        // Send error event
        sendEvent('error', { message: errorMsg });
        
        // End the response
        res.end();
      }
    } catch (error) {
      console.error("Streaming endpoint error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  app.get("/api/public/chatbot/:slug/messages/:sessionId", async (req, res) => {
    const chatbot = await storage.getChatbotBySlug(req.params.slug);
    if (!chatbot) {
      return res.status(404).json({ message: "Chatbot not found" });
    }

    // Check if redaction is requested
    const redact = req.query.redact === 'true';

    let messages = await storage.getMessagesBySession(
      chatbot.id,
      req.params.sessionId
    );
    
    // Apply redaction only to user messages if requested
    if (redact) {
      messages = messages.map(message => {
        // Only redact user messages, not bot responses
        if (message.isUser) {
          return {
            ...message,
            content: redactPII(message.content)
          };
        }
        return message;
      });
    }
    
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
      const redact = req.query.redact === 'true'; // Get redaction preference from query parameter
      
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
      
      // Process logs - first add chatbot name, then apply redaction if enabled
      let processedLogs = await Promise.all(logs.map(async (log) => {
        const chatbot = userChatbots.find(c => c.id === log.chatbotId);
        return {
          ...log,
          chatbotName: chatbot ? chatbot.name : "Unknown Chatbot"
        };
      }));
      
      // Apply redaction if enabled (only to user messages)
      if (redact) {
        processedLogs = processedLogs.map(log => {
          // Only redact user messages, not bot responses
          if (log.isUser) {
            return {
              ...log,
              content: redactPII(log.content)
            };
          }
          return log;
        });
      }
      
      res.json({ 
        logs: processedLogs, 
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        redactionEnabled: redact
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
  
  // Care Team Management API endpoints (for admin users)
  app.get("/api/care-team/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admin users can list care team users
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const careTeamUsers = await storage.getUsersByRole("careteam");
      res.json(careTeamUsers);
    } catch (error) {
      console.error("Error fetching care team users:", error);
      res.status(500).json({ message: "Failed to fetch care team users" });
    }
  });
  
  app.post("/api/care-team/assignments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admin users can assign chatbots to care team users
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const assignment = insertUserChatbotAssignmentSchema.parse(req.body);
      
      // Verify the user exists and is a care team member
      const user = await storage.getUser(assignment.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.role !== "careteam") {
        return res.status(400).json({ message: "User is not a care team member" });
      }
      
      // Verify the chatbot exists
      const chatbot = await storage.getChatbot(assignment.chatbotId);
      if (!chatbot) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      
      const result = await storage.assignChatbotToUser(assignment);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating assignment:", error);
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });
  
  app.delete("/api/care-team/assignments/:userId/:chatbotId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only admin users can remove assignments
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const userId = parseInt(req.params.userId);
      const chatbotId = parseInt(req.params.chatbotId);
      
      if (isNaN(userId) || isNaN(chatbotId)) {
        return res.status(400).json({ message: "Invalid user ID or chatbot ID" });
      }
      
      const result = await storage.removeAssignment(userId, chatbotId);
      
      if (result) {
        res.sendStatus(204);
      } else {
        res.status(404).json({ message: "Assignment not found" });
      }
    } catch (error) {
      console.error("Error removing assignment:", error);
      res.status(500).json({ message: "Failed to remove assignment" });
    }
  });
  
  app.get("/api/care-team/assignments/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    // Admin can view any user's assignments, but care team members can only view their own
    if (req.user.role === "careteam" && req.user.id !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const chatbots = await storage.getAssignedChatbots(userId);
      res.json(chatbots);
    } catch (error) {
      console.error("Error fetching assigned chatbots:", error);
      res.status(500).json({ message: "Failed to fetch assigned chatbots" });
    }
  });
  
  // Care Team data portal API endpoints
  app.get("/api/care-team/chatbots", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only allow care team users
    if (req.user.role !== "careteam") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const assignedChatbots = await storage.getAssignedChatbots(req.user.id);
      res.json(assignedChatbots);
    } catch (error) {
      console.error("Error fetching assigned chatbots:", error);
      res.status(500).json({ message: "Failed to fetch assigned chatbots" });
    }
  });
  
  app.get("/api/care-team/analytics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only allow care team users
    if (req.user.role !== "careteam") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      // Get query parameters
      const chatbotId = req.query.chatbotId as string;
      const timeframe = req.query.timeframe as string || 'all';
      
      // Get assigned chatbots
      const assignedChatbots = await storage.getAssignedChatbots(req.user.id);
      const assignedChatbotIds = assignedChatbots.map(c => c.id);
      
      if (assignedChatbotIds.length === 0) {
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
      
      // Get analytics for specific chatbot or all assigned chatbots
      if (chatbotId && chatbotId !== 'all') {
        const chatbotIdNum = parseInt(chatbotId);
        
        // Check if the requested chatbot is assigned to the user
        if (!assignedChatbotIds.includes(chatbotIdNum)) {
          return res.status(403).json({ message: "Not authorized to access this chatbot's analytics" });
        }
        
        const stats = await storage.getChatbotAnalytics(chatbotIdNum, timeFilter);
        const chatbot = assignedChatbots.find(c => c.id === chatbotIdNum);
        
        res.json({
          careAidStats: [{
            chatbotId: chatbotIdNum,
            chatbotName: chatbot?.name || "Unknown",
            totalSessions: stats.totalSessions,
            totalQueries: stats.totalQueries,
            averageQueriesPerSession: stats.totalSessions > 0 
              ? stats.totalQueries / stats.totalSessions 
              : 0
          }]
        });
      } else {
        // Get analytics for all assigned chatbots
        const overallStats = await storage.getOverallAnalytics(assignedChatbotIds, timeFilter);
        
        // Get individual chatbot analytics
        const chatbotStats = await Promise.all(
          assignedChatbots.map(async (chatbot) => {
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
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });
  
  app.get("/api/care-team/logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Only allow care team users
    if (req.user.role !== "careteam") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      // Get query parameters
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const chatbotId = req.query.chatbotId as string;
      const search = req.query.search as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const redact = req.query.redact === 'true';
      
      // Get assigned chatbots
      const assignedChatbots = await storage.getAssignedChatbots(req.user.id);
      const assignedChatbotIds = assignedChatbots.map(c => c.id);
      
      // Build filter object
      const filter: any = {};
      
      // Filter by assigned chatbots only
      if (chatbotId && chatbotId !== "all") {
        const chatbotIdNum = parseInt(chatbotId);
        
        // Check if the requested chatbot is assigned to the user
        if (!assignedChatbotIds.includes(chatbotIdNum)) {
          return res.status(403).json({ message: "Not authorized to access this chatbot's logs" });
        }
        
        filter.chatbotId = chatbotIdNum;
      } else {
        // Only show logs from assigned chatbots
        filter.chatbotIds = assignedChatbotIds;
      }
      
      if (search) {
        filter.search = search;
      }
      
      if (startDate) {
        filter.startDate = new Date(startDate);
      }
      
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // End of day
        filter.endDate = endDateObj;
      }
      
      const { logs, totalCount } = await storage.getChatLogs(filter, page, pageSize);
      
      // Get chatbot names for logs
      const chatbotMap = new Map(assignedChatbots.map(c => [c.id, c.name]));
      
      // Add chatbot name to each log
      const logsWithChatbotName = logs.map(log => ({
        ...log,
        chatbotName: chatbotMap.get(log.chatbotId) || "Unknown",
        timestamp: log.timestamp
      }));
      
      // Apply PII redaction if requested
      const processedLogs = redact ? redactMessagesPII(logsWithChatbotName) : logsWithChatbotName;
      
      res.json({
        logs: processedLogs, 
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        redactionEnabled: redact
      });
    } catch (error) {
      console.error("Error fetching chat logs:", error);
      res.status(500).json({ message: "Failed to fetch chat logs" });
    }
  });

  // ===== Care Team Portal API Routes =====

  // Authentication middleware for care team only
  function requireCareTeamRole(req, res, next) {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "careteam") return res.sendStatus(403);
    next();
  }

  // Get assigned chatbots for a care team member
  app.get("/api/care-team/chatbots", requireCareTeamRole, async (req, res) => {
    try {
      const chatbots = await storage.getAssignedChatbots(req.user.id);
      res.json(chatbots);
    } catch (error) {
      console.error("Error fetching assigned chatbots:", error);
      res.status(500).json({ message: "Failed to fetch assigned chatbots" });
    }
  });

  // Get chat logs for care team member (filtered by assigned chatbots)
  app.get("/api/care-team/logs", requireCareTeamRole, async (req, res) => {
    try {
      // Get assigned chatbots first
      const chatbots = await storage.getAssignedChatbots(req.user.id);
      
      if (!chatbots || chatbots.length === 0) {
        return res.json({ logs: [], totalCount: 0 });
      }
      
      // Extract chatbot IDs
      const chatbotIds = chatbots.map(chatbot => chatbot.id);
      
      // Parse query parameters
      const chatbotId = req.query.chatbotId ? Number(req.query.chatbotId) : null;
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
      const search = req.query.search as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const redact = req.query.redact !== "false"; // Default to true if not specified
      
      // Build filter object
      const filter: any = {
        chatbotIds: chatbotId ? [Number(chatbotId)] : chatbotIds,
      };
      
      if (search) {
        filter.search = search;
      }
      
      if (startDate) {
        filter.startDate = new Date(startDate);
      }
      
      if (endDate) {
        filter.endDate = new Date(endDate);
      }
      
      // Get logs with pagination
      const { logs: rawLogs, totalCount } = await storage.getChatLogs(filter, page, pageSize);
      
      // Apply redaction if enabled
      const logs = redact ? redactMessagesPII(rawLogs) : rawLogs;
      
      // Add chatbot names to logs for display
      const logsWithChatbotNames = logs.map(log => {
        const chatbot = chatbots.find(c => c.id === log.chatbotId);
        return {
          ...log,
          chatbotName: chatbot ? chatbot.name : "Unknown",
          timestamp: log.timestamp,
        };
      });
      
      res.json({ 
        logs: logsWithChatbotNames, 
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        redactionEnabled: redact
      });
    } catch (error) {
      console.error("Error fetching care team logs:", error);
      res.status(500).json({ message: "Failed to fetch chat logs" });
    }
  });

  // Get analytics data for care team member
  app.get("/api/care-team/analytics", requireCareTeamRole, async (req, res) => {
    try {
      // Get assigned chatbots first
      const chatbots = await storage.getAssignedChatbots(req.user.id);
      
      if (!chatbots || chatbots.length === 0) {
        return res.json({ careAidStats: [] });
      }
      
      // Extract chatbot IDs
      const chatbotIds = chatbots.map(chatbot => chatbot.id);
      
      // Parse query parameters
      const chatbotId = req.query.chatbotId ? Number(req.query.chatbotId) : null;
      const timeframe = req.query.timeframe as string || "all";
      
      // Build time filter object
      const timeFilter: any = {};
      
      if (timeframe === "month") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        timeFilter.startDate = thirtyDaysAgo;
      } else if (timeframe === "week") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        timeFilter.startDate = sevenDaysAgo;
      } else if (timeframe === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        timeFilter.startDate = today;
      }
      
      // If specific chatbot is requested, get stats for just that one
      let responseData: any = { careAidStats: [] };
      
      if (chatbotId) {
        // Verify this chatbot is assigned to the user
        if (!chatbotIds.includes(chatbotId)) {
          return res.status(403).json({ message: "Not authorized to access this chatbot's data" });
        }
        
        const chatbot = chatbots.find(c => c.id === chatbotId);
        const stats = await storage.getChatbotAnalytics(chatbotId, timeFilter);
        
        responseData.careAidStats = [{
          chatbotId: chatbotId,
          chatbotName: chatbot ? chatbot.name : "Unknown",
          totalSessions: stats.totalSessions,
          totalQueries: stats.totalQueries,
          averageQueriesPerSession: stats.totalSessions > 0 ? stats.totalQueries / stats.totalSessions : 0
        }];
      } else {
        // Get overall stats and per-chatbot breakdown
        const overallStats = await storage.getOverallAnalytics(chatbotIds, timeFilter);
        
        // Get individual chatbot stats
        const careAidStatsPromises = chatbots.map(async (chatbot) => {
          const stats = await storage.getChatbotAnalytics(chatbot.id, timeFilter);
          return {
            chatbotId: chatbot.id,
            chatbotName: chatbot.name,
            totalSessions: stats.totalSessions,
            totalQueries: stats.totalQueries,
            averageQueriesPerSession: stats.totalSessions > 0 ? stats.totalQueries / stats.totalSessions : 0
          };
        });
        
        responseData.careAidStats = await Promise.all(careAidStatsPromises);
        
        // Add overall stats with chatbot breakdown
        if (overallStats.totalSessions > 0) {
          responseData.overallStats = {
            totalSessions: overallStats.totalSessions,
            totalQueries: overallStats.totalQueries,
            averageQueriesPerSession: overallStats.totalQueries / overallStats.totalSessions,
            chatbotBreakdown: responseData.careAidStats.map(stat => ({
              chatbotId: stat.chatbotId,
              chatbotName: stat.chatbotName,
              sessions: stat.totalSessions,
              queries: stat.totalQueries
            }))
          };
        }
      }
      
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching care team analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  // ===== Admin API Routes for User Management =====

  // Get admin users 
  app.get("/api/admin/users/admin", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);
    
    try {
      const users = await storage.getUsersByRole("admin");
      console.log("Admin users found for /api/admin/users/admin:", users);
      res.json(users);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch admin users" });
    }
  });

  // Get care team users (consistent endpoint)
  app.get("/api/admin/users/careteam", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);
    
    try {
      const users = await storage.getUsersByRole("careteam");
      console.log("Care team users found for /api/admin/users/careteam:", users);
      res.json(users);
    } catch (error) {
      console.error("Error fetching careteam users:", error);
      res.status(500).json({ message: "Failed to fetch careteam users" });
    }
  });



  // Create a new user (admin or care team)
  app.post("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);
    
    try {
      console.log("Creating user with data:", req.body);
      const userData = insertUserSchema.parse(req.body);
      
      if (userData.role !== "careteam" && userData.role !== "admin") {
        return res.status(400).json({ message: "Invalid role. Must be 'careteam' or 'admin'" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const newUser = await storage.createUser(userData);
      console.log("User created successfully:", newUser.id, newUser.username, newUser.role);
      // Remove password from response
      const { password, ...userResponse } = newUser;
      res.status(201).json(userResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Delete a user
  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);
    
    try {
      const userId = Number(req.params.id);
      
      // Prevent admin from deleting themselves
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Delete the user from the database using SQL
      const { db } = await import("./db");
      await db.delete(users).where(eq(users.id, userId));
      
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });





  // Get chatbot assignments for a specific chatbot
  app.get("/api/admin/chatbots/:id/assignments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);
    
    try {
      const chatbotId = Number(req.params.id);
      const chatbot = await storage.getChatbot(chatbotId);
      
      if (!chatbot) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      
      if (chatbot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to access this chatbot's assignments" });
      }
      
      const assignments = await storage.getChatbotAssignments(chatbotId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching chatbot assignments:", error);
      res.status(500).json({ message: "Failed to fetch chatbot assignments" });
    }
  });

  // Assign chatbot to care team member
  app.post("/api/admin/care-team/assignments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);
    
    try {
      const { userId, chatbotId } = req.body;
      
      if (!userId || !chatbotId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Verify the chatbot belongs to this admin
      const chatbot = await storage.getChatbot(Number(chatbotId));
      if (!chatbot || chatbot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to assign this chatbot" });
      }
      
      // Verify the user exists and has care team role
      const user = await storage.getUser(Number(userId));
      if (!user || user.role !== "careteam") {
        return res.status(400).json({ message: "Invalid care team user" });
      }
      
      const assignment = await storage.assignChatbotToUser({
        userId: Number(userId),
        chatbotId: Number(chatbotId)
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning chatbot to care team member:", error);
      res.status(500).json({ message: "Failed to assign chatbot" });
    }
  });

  // Remove chatbot assignment
  app.delete("/api/admin/care-team/assignments/:userId/:chatbotId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);
    
    try {
      const userId = Number(req.params.userId);
      const chatbotId = Number(req.params.chatbotId);
      
      // Verify the chatbot belongs to this admin
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to manage this chatbot's assignments" });
      }
      
      const success = await storage.removeAssignment(userId, chatbotId);
      
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Assignment not found" });
      }
    } catch (error) {
      console.error("Error removing chatbot assignment:", error);
      res.status(500).json({ message: "Failed to remove assignment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
