import { openai } from "./client";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

// Responses API implementation for non-streaming
export async function generateResponseCompletion({
  userMessage,
  chatbot,
  systemPrompt,
  previousMessages = [],
  fallbackResponse = "I couldn't generate a response.",
}: {
  userMessage: string;
  chatbot?: { vectorStoreId?: string };
  systemPrompt?: string;
  previousMessages?: Message[];
  fallbackResponse?: string;
}): Promise<string> {
  try {
    console.log("Making responses API call with:", { 
      model: "gpt-4o-mini", 
      input: userMessage,
      hasVectorStore: !!chatbot?.vectorStoreId,
      hasSystemPrompt: !!systemPrompt,
      conversationLength: previousMessages.length
    });
    
    // Build full conversation context for Responses API
    let input = "";
    
    // Add system prompt first
    if (systemPrompt) {
      input += `${systemPrompt}\n\n`;
    }
    
    // Add conversation history
    if (previousMessages.length > 0) {
      input += "Conversation history:\n";
      previousMessages.forEach(msg => {
        const role = msg.role === "user" ? "User" : "Assistant";
        input += `${role}: ${msg.content}\n`;
      });
      input += "\n";
    }
    
    // Add current user message
    input += `User: ${userMessage}`;
    
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: input,
      ...(chatbot?.vectorStoreId && {
        tools: [{
          type: "file_search",
          vector_store_ids: [chatbot.vectorStoreId],
        }]
      }),
    });

    console.log("Responses API response:", JSON.stringify(response, null, 2));
    return (response as any).output || fallbackResponse;
  } catch (error) {
    console.error("OpenAI responses completion error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return fallbackResponse;
  }
}

// Streaming responses API implementation
export async function generateStreamingResponseCompletion({
  userMessage,
  chatbot,
  systemPrompt,
  previousMessages = [],
  onChunk,
  onComplete,
  onError,
  fallbackResponse = "I couldn't generate a response.",
}: {
  userMessage: string;
  chatbot?: { vectorStoreId?: string };
  systemPrompt?: string;
  previousMessages?: Message[];
  onChunk: (chunk: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: any) => void;
  fallbackResponse?: string;
}): Promise<void> {
  console.log("=== RESPONSES API CALLED ===");
  console.log("User message:", userMessage);
  console.log("System prompt:", systemPrompt);
  console.log("Has vector store:", !!chatbot?.vectorStoreId);
  console.log("Conversation length:", previousMessages.length);
  
  try {
    // Build full conversation context for Responses API
    let input = "";
    
    // Add system prompt first
    if (systemPrompt) {
      input += `${systemPrompt}\n\n`;
    }
    
    // Add conversation history
    if (previousMessages.length > 0) {
      input += "Conversation history:\n";
      previousMessages.forEach(msg => {
        const role = msg.role === "user" ? "User" : "Assistant";
        input += `${role}: ${msg.content}\n`;
      });
      input += "\n";
    }
    
    // Add current user message
    input += `User: ${userMessage}`;

    const requestConfig: any = {
      model: "gpt-4o-mini",
      input: input,
      stream: true,
    };

    // Add vector store tools if available
    if (chatbot?.vectorStoreId) {
      requestConfig.tools = [{
        type: "file_search",
        vector_store_ids: [chatbot.vectorStoreId],
      }];
    }

    console.log("Responses API request config:", JSON.stringify(requestConfig, null, 2));

    const stream = await openai.responses.create(requestConfig);

    let fullResponse = "";
    
    for await (const chunk of stream as any) {
      console.log("Received chunk:", JSON.stringify(chunk, null, 2));
      
      const eventType = chunk.type || chunk.event || "";

      // Handle different event types according to Responses API streaming docs
      if (eventType === "response.output_text.delta") {
        const token = chunk.delta;
        if (token) {
          onChunk(token);
          fullResponse += token;
        }
      } else if (eventType === "response.output_text.done") {
        // Final output text event
        console.log("Response output text done");
        break;
      } else if (eventType === "response.done") {
        // Response completely finished
        console.log("Response completely done");
        break;
      } else if (eventType === "error") {
        // Handle streaming errors
        console.error("Streaming error event:", chunk);
        throw new Error(chunk.error?.message || "Streaming error occurred");
      }
    }

    if (fullResponse.trim() === "") {
      fullResponse = fallbackResponse;
      onChunk(fallbackResponse);
    }

    onComplete(fullResponse);
  } catch (error) {
    console.error("OpenAI streaming responses completion error:", error);
    onError(fallbackResponse);
  }
}