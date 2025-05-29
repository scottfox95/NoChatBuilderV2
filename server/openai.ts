import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

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
    } else {
      return {
        valid: false,
        message: `API error: ${error.message || "Unknown error occurred."}`
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
    const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      ...previousMessages,
      { role: "user" as const, content: userMessage },
    ];

    const completionParams = {
      model: "gpt-4o-mini",
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(chatbot?.vectorStoreId && {
        tools: [{
          type: "file_search" as const,
          file_search: {
            vector_store_ids: [chatbot.vectorStoreId],
          }
        }]
      }),
      ...(stream && { stream: true }),
    };

    const resp = await openai.chat.completions.create(completionParams);

    if (!stream) {
      return resp.choices[0].message.content || fallbackResponse || "I couldn't generate a response.";
    }

    const chunks: string[] = [];
    let fullResponse = "";
    
    for await (const chunk of resp) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        chunks.push(content);
        fullResponse += content;
        onChunk?.(content);
      }
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

// Backward compatibility wrapper
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
  let enhancedSystemPrompt = systemPrompt;
  
  if (documents && documents.length > 0) {
    const combinedDocs = documents.join("\n\n");
    const contextLimit = 4000;
    const truncatedDocs = combinedDocs.length > contextLimit
      ? combinedDocs.substring(0, contextLimit) + "..."
      : combinedDocs;
    
    enhancedSystemPrompt += `\n\nHere is additional context to help answer the user's questions:\n${truncatedDocs}`;
  }

  return await askLLM({
    userMessage,
    systemPrompt: enhancedSystemPrompt,
    previousMessages,
    temperature,
    maxTokens,
    stream: false,
    fallbackResponse,
  }) as string;
}

// Streaming completion function using Responses API
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

    // Combine all messages into a single input string
    const allMessages = [
      { role: "system", content: enhancedSystemPrompt },
      ...previousMessages,
      { role: "user", content: userMessage },
    ];
    
    const combinedInput = allMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');

    // Map internal model names to actual OpenAI model IDs
    const modelMap: Record<string, string> = {
      "gpt4-1": "gpt-4-1106-preview",
      "gpt4o": "gpt-4o",
      "gpt4": "gpt-4",
      "gpt4-mini": "gpt-4o-mini",
      "gpt35turbo": "gpt-3.5-turbo",
      "gpt3-mini": "gpt-3.5-turbo-instruct",
      "gpt4-1-nano": "gpt-4-0125-preview",
      "gpt4o-mini": "gpt-4o-mini",
    };

    const actualModel = modelMap[model] || "gpt-4o-mini";

    let fullResponse = "";

    const resp = await openai.responses.create({
      model: actualModel,
      input: combinedInput,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    const chunks: string[] = [];
    for await (const chunk of resp) {
      const d = chunk.choices[0].delta;
      if (d.content) {
        chunks.push(d.content);
        fullResponse += d.content;
        onChunk(d.content);
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
  
  // For PDF and DOCX processing, you would use:
  // - PDF.js for PDFs
  // - Mammoth.js for DOCX files
  
  return text;
}

// Exponential backoff utility for rate limiting
async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error (429)
      if (error.status === 429 && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For non-rate limit errors or max retries reached, throw immediately
      throw error;
    }
  }
  
  throw lastError;
}

// Check vector store usage and limits
export async function checkVectorStoreCapacity(vectorStoreId: string): Promise<{
  canUpload: boolean;
  usage?: {
    fileCount: number;
    totalBytes: number;
  };
  error?: string;
}> {
  try {
    const vectorStore = await withExponentialBackoff(() => 
      openai.vectorStores.retrieve(vectorStoreId)
    );
    
    // OpenAI vector store limits (as of latest documentation)
    const MAX_FILES = 500;
    const MAX_BYTES = 100 * 1024 * 1024 * 1024; // 100GB
    
    const usage = {
      fileCount: vectorStore.file_counts?.total || 0,
      totalBytes: vectorStore.usage_bytes || 0
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
      openai.chat.completions.create(completionOptions)
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
