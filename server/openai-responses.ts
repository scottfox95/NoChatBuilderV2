import { openai } from "./client";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

// Simple responses API implementation for non-streaming
export async function generateResponseCompletion({
  userMessage,
  chatbot,
  systemPrompt,
  fallbackResponse = "I couldn't generate a response.",
}: {
  userMessage: string;
  chatbot?: { vectorStoreId?: string };
  systemPrompt?: string;
  fallbackResponse?: string;
}): Promise<string> {
  try {
    console.log("Making responses API call with:", { 
      model: "gpt-4o-mini", 
      input: userMessage,
      hasVectorStore: !!chatbot?.vectorStoreId 
    });
    
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: userMessage,
      ...(systemPrompt && { instructions: systemPrompt }),
      ...(chatbot?.vectorStoreId && {
        tools: [{
          type: "file_search",
          vector_store_ids: [chatbot.vectorStoreId],
        }]
      }),
    });

    console.log("Responses API response:", JSON.stringify(response, null, 2));
    return (response as any).output_text || fallbackResponse;
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
  onChunk,
  onComplete,
  onError,
  fallbackResponse = "I couldn't generate a response.",
}: {
  userMessage: string;
  chatbot?: { vectorStoreId?: string };
  systemPrompt?: string;
  onChunk: (chunk: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: any) => void;
  fallbackResponse?: string;
}): Promise<void> {
  console.log("=== RESPONSES API CALLED ===");
  console.log("User message:", userMessage);
  console.log("System prompt:", systemPrompt);
  console.log("Has vector store:", !!chatbot?.vectorStoreId);
  
  try {
    const requestConfig: any = {
      model: "gpt-4o-mini",
      input: userMessage,
      stream: true,
      ...(systemPrompt && { instructions: systemPrompt }),
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