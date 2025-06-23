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
import { PlusCircle, XCircle, X, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import WelcomeInput from "./WelcomeInput";
import SuggestedQuestionInput from "./SuggestedQuestionInput";

export default function BasicSetup() {
  const form = useFormContext();
  const [newQuestion, setNewQuestion] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(
    form.getValues().suggestedQuestions || []
  );
  
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
                    onSaveAsCommon={(messageText) => {
                      // This will be handled by a mutation when the user checks the save checkbox
                      console.log('Save as common welcome message:', messageText);
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
            <FormLabel className="text-neutral-300">System Prompt</FormLabel>
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
              >
                <optgroup label="Latest Models">
                  <option value="gpt-4o">GPT-4o (Latest & Most Capable)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Fast & Efficient)</option>
                </optgroup>
                <optgroup label="GPT-4 Family">
                  <option value="gpt-4-turbo">GPT-4 Turbo (High Performance)</option>
                  <option value="gpt-4">GPT-4 (Stable)</option>
                </optgroup>
                <optgroup label="GPT-3.5 Family">
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Cost Effective)</option>
                </optgroup>
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
