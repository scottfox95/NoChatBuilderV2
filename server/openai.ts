import { openai } from "./client";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

// Function to verify if the OpenAI API key is valid
export async function verifyApiKey(): Promise<{
  valid: boolean;
  message: string;
  models?: string[];
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        valid: false,
        message: "OpenAI API key is not set."
      };
    }
    
    // Make a simple request to the models endpoint to check if the key is valid
    const response = await openai.models.list();
    
    // Extract the model IDs we care about (GPT models)
    const gptModels = response.data
      .filter(model => 
        model.id.includes("gpt") || 
        model.id.includes("GPT") ||
        model.id.includes("text-davinci")
      )
      .map(model => model.id)
      .sort();
    
    return {
      valid: true,
      message: "API key is valid and functioning correctly.",
      models: gptModels
    };
  } catch (error: any) {
    console.error("API key verification error:", error);
    
    // Check for specific error messages from OpenAI
    if (error.status === 401) {
      return {
        valid: false,
        message: "Invalid API key. Please check your OpenAI API key and try again."
      };
    } else if (error.status === 429) {
      return {
        valid: false,
        message: "Rate limit exceeded. Your API key is valid but has reached its usage limit."
      };
    } else if (error.status === 403) {
      return {
        valid: false,
        message: "Access denied. Your API key may not have the necessary permissions."
      };
    } else {
      return {
        valid: false,
        message: `API verification failed: ${error.message || "Unknown error"}`
      };
    }
  }
}

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

interface CompletionOptions {
  model: string;
  systemPrompt: string;
  userMessage: string;
  previousMessages: Message[];
  temperature: number;
  maxTokens: number;
  documents: string[];
  fallbackResponse?: string;
}

interface StreamingCompletionOptions extends CompletionOptions {
  onChunk: (chunk: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: any) => void;
}

// Single helper that covers both streaming and non-streaming modes
export async function askLLM({
  userMessage,
  chatbot,
  systemPrompt,
  previousMessages = [],
  temperature = 0.7,
  maxTokens = 512,
  stream = true,
  onChunk,
  onComplete,
  onError,
  fallbackResponse,
}: {
  userMessage: string;
  chatbot?: { vectorStoreId?: string };
  systemPrompt?: string;
  previousMessages?: Message[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onChunk?: (chunk: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: any) => void;
  fallbackResponse?: string;
}): Promise<string | void> {
  try {
    const messages = [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      ...previousMessages,
      { role: "user" as const, content: userMessage },
    ];

    const completionParams: any = {
      model: "gpt-4o-mini",
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(chatbot?.vectorStoreId && {
        tools: [{
          type: "file_search",
          vector_store_ids: [chatbot.vectorStoreId],
        }]
      }),
      ...(stream && { stream: true }),
    };

    const resp = await openai.chat.completions.create(completionParams);

    if (!stream) {
      const response = resp as any;
      return response.choices[0].message.content || fallbackResponse || "I couldn't generate a response.";
    }

    const chunks: string[] = [];
    let fullResponse = "";
    
    for await (const chunk of resp as any) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        chunks.push(content);
        fullResponse += content;
        onChunk?.(content);
      }
      // DO NOT expose file_search_results
    }

    if (fullResponse.trim() === "" && fallbackResponse) {
      fullResponse = fallbackResponse;
      onChunk?.(fallbackResponse);
    } else if (fullResponse.trim() === "") {
      fullResponse = "I'm sorry, I couldn't generate a response.";
      onChunk?.(fullResponse);
    }

    onComplete?.(fullResponse);
    return fullResponse;
  } catch (error) {
    console.error("OpenAI completion error:", error);
    const errorResponse = fallbackResponse || "I'm sorry, I couldn't process your request at this time.";
    if (stream) {
      onError?.(errorResponse);
    } else {
      return errorResponse;
    }
  }
}

// Standard non-streaming completion (keep for backward compatibility)
export async function generateCompletion({
  model,
  systemPrompt,
  userMessage,
  previousMessages,
  temperature,
  maxTokens,
  documents,
  fallbackResponse,
}: CompletionOptions): Promise<string> {
  try {
    // Create a modified system prompt that includes documents if RAG is enabled
    let enhancedSystemPrompt = systemPrompt;
    
    if (documents && documents.length > 0) {
      // Combine all document text but limit by token count (rough approximation)
      const combinedDocs = documents.join("\n\n");
      const contextLimit = 4000; // Rough limit to avoid token limits
      const truncatedDocs = combinedDocs.length > contextLimit
        ? combinedDocs.substring(0, contextLimit) + "..."
        : combinedDocs;
      
      enhancedSystemPrompt += `\n\nHere is additional context to help answer the user's questions:\n${truncatedDocs}`;
    }

    // Prepare messages for OpenAI
    const messages: Message[] = [
      { role: "system", content: enhancedSystemPrompt },
      ...previousMessages,
      { role: "user", content: userMessage },
    ];

    // Map internal model names to actual OpenAI model IDs
    const modelMap: Record<string, string> = {
      "gpt4-1": "gpt-4-1106-preview", // GPT-4.1 Turbo (similar naming convention)
      "gpt4o": "gpt-4o", // GPT-4o (latest model as of May 2024)
      "gpt4": "gpt-4",
      "gpt4-mini": "gpt-4o-mini", // GPT-4 Mini
      "gpt35turbo": "gpt-3.5-turbo",
      "gpt3-mini": "gpt-3.5-turbo-instruct", // GPT-3.5 Turbo Instruct (more like GPT-3 Mini)
      "gpt4-1-nano": "gpt-4-0125-preview", // GPT-4.1 Nano (approximation based on parameter count)
      "gpt4o-mini": "gpt-4o-mini", // GPT-4o Mini
    };

    const actualModel = modelMap[model] || "gpt-3.5-turbo";

    const response = await openai.chat.completions.create({
      model: actualModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0].message.content || fallbackResponse || "I couldn't generate a response.";
  } catch (error) {
    console.error("OpenAI completion error:", error);
    return fallbackResponse || "I'm sorry, I couldn't process your request at this time.";
  }
}

// Streaming completion function that sends chunks as they arrive
export async function generateStreamingCompletion({
  model,
  systemPrompt,
  userMessage,
  previousMessages,
  temperature,
  maxTokens,
  documents,
  fallbackResponse,
  onChunk,
  onComplete,
  onError,
}: StreamingCompletionOptions): Promise<void> {
  try {
    // Create a modified system prompt that includes documents if RAG is enabled
    let enhancedSystemPrompt = systemPrompt;
    
    if (documents && documents.length > 0) {
      // Combine all document text but limit by token count (rough approximation)
      const combinedDocs = documents.join("\n\n");
      const contextLimit = 4000; // Rough limit to avoid token limits
      const truncatedDocs = combinedDocs.length > contextLimit
        ? combinedDocs.substring(0, contextLimit) + "..."
        : combinedDocs;
      
      enhancedSystemPrompt += `\n\nHere is additional context to help answer the user's questions:\n${truncatedDocs}`;
    }

    // Prepare messages for OpenAI
    const messages: Message[] = [
      { role: "system", content: enhancedSystemPrompt },
      ...previousMessages,
      { role: "user", content: userMessage },
    ];

    // Map internal model names to actual OpenAI model IDs
    const modelMap: Record<string, string> = {
      "gpt4-1": "gpt-4-1106-preview", // GPT-4.1 Turbo (similar naming convention)
      "gpt4o": "gpt-4o", // GPT-4o (latest model as of May 2024)
      "gpt4": "gpt-4",
      "gpt4-mini": "gpt-4o-mini", // GPT-4 Mini
      "gpt35turbo": "gpt-3.5-turbo",
      "gpt3-mini": "gpt-3.5-turbo-instruct", // GPT-3.5 Turbo Instruct (more like GPT-3 Mini)
      "gpt4-1-nano": "gpt-4-0125-preview", // GPT-4.1 Nano (approximation based on parameter count)
      "gpt4o-mini": "gpt-4o-mini", // GPT-4o Mini
    };

    const actualModel = modelMap[model] || "gpt-3.5-turbo";

    let fullResponse = "";

    const stream = await openai.responses.create({
      model: actualModel,
      input: userMessage,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.content || "";
      if (content) {
        fullResponse += content;
        onChunk(content);
      }
    }

    if (fullResponse.trim() === "" && fallbackResponse) {
      fullResponse = fallbackResponse;
      onChunk(fallbackResponse);
    } else if (fullResponse.trim() === "") {
      fullResponse = "I'm sorry, I couldn't generate a response.";
      onChunk(fullResponse);
    }

    onComplete(fullResponse);
  } catch (error) {
    console.error("OpenAI streaming completion error:", error);
    const errorResponse = fallbackResponse || "I'm sorry, I couldn't process your request at this time.";
    onError(errorResponse);
  }
}

export async function processDocumentText(text: string, fileType: string): Promise<string> {
  // In a real implementation, we would process PDFs, DOCXs, etc. differently
  // For simplicity, we're just returning the text directly
  return text;
}

async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain error types
      if (error.status === 401 || error.status === 403) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export async function checkVectorStoreCapacity(vectorStoreId: string): Promise<{
  canUpload: boolean;
  usage?: { fileCount: number; totalBytes: number };
  error?: string;
}> {
  try {
    if (!vectorStoreId) {
      return {
        canUpload: false,
        error: "No vector store ID provided"
      };
    }

    // For now, we'll assume capacity is available
    // In a real implementation, you'd check the actual vector store usage
    const MAX_FILES = 500;
    const MAX_BYTES = 100 * 1024 * 1024; // 100MB
    
    // Simulated usage check
    const usage = {
      fileCount: 0, // Would be fetched from vector store
      totalBytes: 0 // Would be calculated from actual files
    };
    
    const canUpload = usage.fileCount < MAX_FILES && usage.totalBytes < MAX_BYTES;
    
    return {
      canUpload,
      usage,
      error: canUpload ? undefined : "Vector store capacity limit reached"
    };
  } catch (error: any) {
    console.error("Error checking vector store capacity:", error);
    return {
      canUpload: false,
      error: "Unable to check vector store capacity"
    };
  }
}

interface AssistantCompletionOptions {
  model: string;
  systemPrompt: string;
  userMessage: string;
  previousMessages: Message[];
  vectorStoreId?: string;
  temperature: number;
  maxTokens: number;
  fallbackResponse?: string;
}

interface StreamingAssistantCompletionOptions extends AssistantCompletionOptions {
  onChunk: (chunk: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: any) => void;
}

export async function generateAssistantCompletion({
  model,
  systemPrompt,
  userMessage,
  previousMessages,
  vectorStoreId,
  temperature,
  maxTokens,
  fallbackResponse
}: AssistantCompletionOptions): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    // Build messages array with citation guard for vector store queries
    const citationGuard = "The assistant must never reference internal files, filenames, or other source details. Answer authoritatively without citing sources.";
    const enhancedSystemPrompt = vectorStoreId ? `${citationGuard}\n\n${systemPrompt}` : systemPrompt;
    
    const messages: any[] = [
      { role: "system", content: enhancedSystemPrompt },
      ...previousMessages,
      { role: "user", content: userMessage }
    ];

    const completionOptions: any = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    const response = await withExponentialBackoff(() => 
      openai.responses.create({
        model,
        input: userMessage,
        ...(vectorStoreId && {
          tools: [{
            type: "file_search",
            vector_store_ids: [vectorStoreId],
          }]
        }),
        stream: false,
      })
    );
    
    const content = response.choices[0].message.content;
    
    if (!content && fallbackResponse) {
      return fallbackResponse;
    }
    
    return content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("OpenAI assistant completion error:", error);
    return fallbackResponse || "I'm sorry, I couldn't process your request at this time.";
  }
}

export async function generateStreamingAssistantCompletion({
  model,
  systemPrompt,
  userMessage,
  previousMessages,
  vectorStoreId,
  temperature,
  maxTokens,
  fallbackResponse,
  onChunk,
  onComplete,
  onError
}: StreamingAssistantCompletionOptions): Promise<void> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    // Build messages array with citation guard for vector store queries
    const citationGuard = "The assistant must never reference internal files, filenames, or other source details. Answer authoritatively without citing sources.";
    const enhancedSystemPrompt = vectorStoreId ? `${citationGuard}\n\n${systemPrompt}` : systemPrompt;
    
    const messages: any[] = [
      { role: "system", content: enhancedSystemPrompt },
      ...previousMessages,
      { role: "user", content: userMessage }
    ];

    const completionOptions: any = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    const stream = await withExponentialBackoff(() => 
      openai.chat.completions.create(completionOptions)
    );

    let fullResponse = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        onChunk(content);
      }
    }

    if (fullResponse.trim() === "" && fallbackResponse) {
      fullResponse = fallbackResponse;
      onChunk(fallbackResponse);
    } else if (fullResponse.trim() === "") {
      fullResponse = "I'm sorry, I couldn't generate a response.";
      onChunk(fullResponse);
    }

    onComplete(fullResponse);
  } catch (error) {
    console.error("OpenAI streaming assistant completion error:", error);
    const errorResponse = fallbackResponse || "I'm sorry, I couldn't process your request at this time.";
    onError(errorResponse);
  }
}