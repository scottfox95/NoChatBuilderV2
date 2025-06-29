import { useFormContext } from "react-hook-form";
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormDescription, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, XCircle, X, Plus, Expand } from "lucide-react";
import { useState, useEffect } from "react";
import WelcomeInput from "./WelcomeInput";
import SuggestedQuestionInput from "./SuggestedQuestionInput";
import useModels from "@/hooks/useModels";

export default function BasicSetup() {
  const form = useFormContext();
  const { models, isLoading: modelsLoading } = useModels();
  const [newQuestion, setNewQuestion] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(
    form.getValues().suggestedQuestions || []
  );
  const [expandedPrompt, setExpandedPrompt] = useState('');
  
  // Initialize form values if they don't exist
  useEffect(() => {
    if (!form.getValues().suggestedQuestions) {
      form.setValue('suggestedQuestions', []);
    }
    
    // Initialize welcomeMessages if it doesn't exist or isn't an array
    if (!form.getValues().welcomeMessages || !Array.isArray(form.getValues().welcomeMessages)) {
      const defaultMessage = form.getValues().welcomeMessage || "Hello! How can I assist you today?";
      form.setValue('welcomeMessages', [defaultMessage]);
    }
  }, [form]);
  
  const addSuggestedQuestion = () => {
    if (!newQuestion.trim()) return;
    
    const updatedQuestions = [...suggestedQuestions, newQuestion.trim()];
    setSuggestedQuestions(updatedQuestions);
    form.setValue('suggestedQuestions', updatedQuestions);
    setNewQuestion('');
  };

  const removeSuggestedQuestion = (index: number) => {
    const updatedQuestions = suggestedQuestions.filter((_, i) => i !== index);
    setSuggestedQuestions(updatedQuestions);
    form.setValue('suggestedQuestions', updatedQuestions);
  };

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-neutral-300">Chatbot Name</FormLabel>
            <FormControl>
              <Input 
                placeholder="e.g., Customer Support Assistant" 
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary"
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-neutral-300">Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="What does this chatbot do?" 
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary resize-none" 
                rows={3}
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="slug"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-neutral-300">URL Slug</FormLabel>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-neutral-700 bg-neutral-800 text-neutral-500">
                yourdomain.com/chat/
              </span>
              <FormControl>
                <Input 
                  placeholder="customer-support" 
                  className="rounded-l-none bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary"
                  {...field} 
                />
              </FormControl>
            </div>
            <FormDescription className="text-neutral-500 text-xs">
              This will be the URL where your chatbot is accessible.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="welcomeMessages"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-neutral-300">Welcome Messages</FormLabel>
            <div className="space-y-2">
              {(Array.isArray(field.value) ? field.value : []).map((message: string, index: number) => (
                <div key={index} className="space-y-2">
                  <WelcomeInput
                    value={message}
                    onChange={(newMessage) => {
                      const messages = Array.isArray(field.value) ? field.value : [];
                      const newMessages = [...messages];
                      newMessages[index] = newMessage;
                      field.onChange(newMessages);
                    }}
                    onSaveAsCommon={async (messageText) => {
                      // Save as common welcome message
                      if (user) {
                        try {
                          await apiRequest('POST', '/api/common-messages', {
                            userId: user.id,
                            kind: 'welcome',
                            text: messageText
                          });
                        } catch (error) {
                          console.error('Failed to save common welcome message:', error);
                        }
                      }
                    }}
                  />
                  {(Array.isArray(field.value) ? field.value.length : 0) > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const messages = Array.isArray(field.value) ? field.value : [];
                        const newMessages = [...messages];
                        newMessages.splice(index, 1);
                        field.onChange(newMessages);
                      }}
                      className="text-xs text-neutral-400 hover:text-red-500"
                    >
                      <X className="mr-1 h-3 w-3" /> Remove Message
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentMessages = Array.isArray(field.value) ? field.value : [];
                  field.onChange([...currentMessages, "Hello! How can I assist you today?"]);
                }}
                className="mt-2 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700"
              >
                <PlusCircle className="mr-1 h-3 w-3" /> Add Welcome Message
              </Button>
            </div>
            <FormDescription className="text-neutral-500 text-xs">
              Add welcome messages that will be randomly shown when a user first opens the chat. 
              Having multiple messages adds variety for returning users.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="suggestedQuestions"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-neutral-300">Suggested Questions</FormLabel>
            <div className="space-y-2">
              {field.value.map((question: string, index: number) => (
                <div key={index} className="space-y-2">
                  <SuggestedQuestionInput
                    question={question}
                    onChange={(newQuestion) => {
                      const newQuestions = [...field.value];
                      newQuestions[index] = newQuestion;
                      field.onChange(newQuestions);
                    }}
                    onSaveAsCommon={async (questionText) => {
                      // Save as common FAQ question
                      if (user) {
                        try {
                          await apiRequest('POST', '/api/common-messages', {
                            userId: user.id,
                            kind: 'faq',
                            text: questionText
                          });
                        } catch (error) {
                          console.error('Failed to save common FAQ question:', error);
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newQuestions = [...field.value];
                      newQuestions.splice(index, 1);
                      field.onChange(newQuestions);
                    }}
                    className="text-xs text-neutral-400 hover:text-red-500"
                  >
                    <X className="mr-1 h-3 w-3" /> Remove Question
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  field.onChange([...field.value, ""]);
                }}
                className="mt-2 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700"
              >
                <PlusCircle className="mr-1 h-3 w-3" /> Add Question
              </Button>
            </div>
            <FormDescription className="text-neutral-500 text-xs">
              Add questions that will be shown as suggestions to users at the start of the chat.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="systemPrompt"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel className="text-neutral-300">System Prompt</FormLabel>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-neutral-400 hover:text-white hover:bg-neutral-700"
                    onClick={() => setExpandedPrompt(field.value || '')}
                  >
                    <Expand className="h-4 w-4 mr-1" />
                    Expand
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl h-[80vh] bg-neutral-900 border-neutral-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">System Prompt - Expanded View</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col h-full">
                    <Textarea
                      value={expandedPrompt}
                      onChange={(e) => setExpandedPrompt(e.target.value)}
                      placeholder="You are a helpful customer support assistant..."
                      className="flex-1 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary resize-none"
                      rows={20}
                    />
                    <div className="flex justify-between items-center pt-4">
                      <p className="text-neutral-500 text-xs">
                        This is the instruction that guides how your chatbot behaves.
                      </p>
                      <div className="flex gap-2">
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700"
                          >
                            Cancel
                          </Button>
                        </DialogTrigger>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            onClick={() => {
                              field.onChange(expandedPrompt);
                            }}
                            className="bg-primary hover:bg-primary/90"
                          >
                            Save Changes
                          </Button>
                        </DialogTrigger>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <FormControl>
              <Textarea 
                placeholder="You are a helpful customer support assistant..." 
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary resize-none" 
                rows={5}
                {...field} 
              />
            </FormControl>
            <FormDescription className="text-neutral-500 text-xs">
              This is the instruction that guides how your chatbot behaves.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="model"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-neutral-300">AI Model</FormLabel>
            <FormControl>
              <select 
                className="w-full bg-neutral-800 border border-neutral-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                {...field}
                disabled={modelsLoading}
              >
                {modelsLoading ? (
                  <option>Loading models...</option>
                ) : (
                  <>
                    <optgroup label="Latest Models">
                      {models.filter(m => m.includes('gpt-4o')).map(model => (
                        <option key={model} value={model}>
                          {model === 'gpt-4o' ? 'GPT-4o (Latest & Most Capable)' :
                           model === 'gpt-4o-mini' ? 'GPT-4o Mini (Fast & Efficient)' :
                           model}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="GPT-4 Family">
                      {models.filter(m => m.includes('gpt-4') && !m.includes('gpt-4o')).map(model => (
                        <option key={model} value={model}>
                          {model === 'gpt-4-turbo' ? 'GPT-4 Turbo (High Performance)' :
                           model === 'gpt-4' ? 'GPT-4 (Stable)' :
                           model}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="GPT-3.5 Family">
                      {models.filter(m => m.includes('gpt-3.5')).map(model => (
                        <option key={model} value={model}>
                          {model === 'gpt-3.5-turbo' ? 'GPT-3.5 Turbo (Cost Effective)' : model}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Other Models">
                      {models.filter(m => !m.includes('gpt-4') && !m.includes('gpt-3.5')).map(model => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
            </FormControl>
            <FormDescription className="text-neutral-500 text-xs">
              More capable models may incur higher costs but provide better responses.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />


    </div>
  );
}
