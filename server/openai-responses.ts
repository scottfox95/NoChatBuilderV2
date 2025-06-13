import { openai } from "./client";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

// Simple responses API implementation for non-streaming
export async function generateResponseCompletion({
  userMessage,
  chatbot,
  fallbackResponse = "I couldn't generate a response.",
}: {
  userMessage: string;
  chatbot?: { vectorStoreId?: string };
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
  onChunk,
  onComplete,
  onError,
  fallbackResponse = "I couldn't generate a response.",
}: {
  userMessage: string;
  chatbot?: { vectorStoreId?: string };
  onChunk: (chunk: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: any) => void;
  fallbackResponse?: string;
}): Promise<void> {
  console.log("=== RESPONSES API CALLED ===");
  console.log("User message:", userMessage);
  console.log("Has vector store:", !!chatbot?.vectorStoreId);
  
  try {
    // For vector store requests, try responses API first, but fall back to chat completions if it fails
    if (chatbot?.vectorStoreId) {
      try {
        const stream = await openai.responses.create({
          model: "gpt-4o-mini",
          input: userMessage,
          tools: [{
            type: "file_search",
            vector_store_ids: [chatbot.vectorStoreId],
          }],
          stream: true,
        });

        let fullResponse = "";
        
        for await (const chunk of stream as any) {
          const ev = chunk.type ?? chunk.event ?? "";

          /* incremental tokens */
          if (ev === "response.output_text.delta") {
            const token = chunk.delta as string;
            if (token) {
              onChunk(token);
              fullResponse += token;
            }
          }

          /* end‑of‑answer */
          if (ev === "response.output_text.done" || ev === "response.completed") {
            break;
          }
        }

        if (fullResponse.trim() === "") {
          fullResponse = fallbackResponse;
          onChunk(fallbackResponse);
        }

        onComplete(fullResponse);
        return;
      } catch (responsesError) {
        console.log("Responses API failed, falling back to chat completions:", responsesError);
        
        // Fall back to chat completions API for vector store requests
        const stream = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a helpful healthcare assistant. Use the information from the knowledge base to provide accurate, helpful responses to healthcare questions."
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          tools: [{
            type: "file_search"
          }],
          tool_resources: {
            file_search: {
              vector_store_ids: [chatbot.vectorStoreId]
            }
          },
          stream: true,
          temperature: 0.7,
          max_tokens: 1000,
        });

        let fullResponse = "";
        
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            onChunk(content);
            fullResponse += content;
          }
        }

        if (fullResponse.trim() === "") {
          fullResponse = fallbackResponse;
          onChunk(fallbackResponse);
        }

        onComplete(fullResponse);
        return;
      }
    }

    // For non-vector store requests, use responses API
    const stream = await openai.responses.create({
      model: "gpt-4o-mini",
      input: userMessage,
      stream: true,
    });

    let fullResponse = "";
    
    for await (const chunk of stream as any) {
      const ev = chunk.type ?? chunk.event ?? "";

      /* incremental tokens */
      if (ev === "response.output_text.delta") {
        const token = chunk.delta as string;
        if (token) {
          onChunk(token);
          fullResponse += token;
        }
      }

      /* end‑of‑answer */
      if (ev === "response.output_text.done" || ev === "response.completed") {
        break;
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