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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, XCircle, X, Plus, Settings, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useWelcomeMessages } from "@/hooks/use-welcome-messages";

export default function BasicSetup() {
  const form = useFormContext();
  const [newQuestion, setNewQuestion] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(
    form.getValues().suggestedQuestions || []
  );
  const [newCustomMessage, setNewCustomMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { allMessages, customMessages, addCustomMessage, removeCustomMessage, isLoading } = useWelcomeMessages();
  
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
            
            {/* Quick Add Dropdown with Settings */}
            <div className="mb-3 flex gap-2">
              <div className="flex-1">
                <Select 
                  onValueChange={(value) => {
                    if (value === "custom") return;
                    const currentMessages = Array.isArray(field.value) ? field.value : [];
                    // Avoid duplicates
                    if (!currentMessages.includes(value)) {
                      field.onChange([...currentMessages, value]);
                    }
                  }}
                >
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700">
                    <SelectValue placeholder="Quick add common messages" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    {!isLoading && allMessages.map((message: string, index: number) => (
                      <SelectItem 
                        key={index} 
                        value={message}
                        className="text-neutral-300 hover:bg-neutral-700 focus:bg-neutral-700"
                      >
                        {message.length > 50 ? `${message.substring(0, 50)}...` : message}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Settings Button */}
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white">Manage Welcome Messages</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Add new custom message */}
                    <div className="flex gap-2">
                      <Input
                        value={newCustomMessage}
                        onChange={(e) => setNewCustomMessage(e.target.value)}
                        placeholder="Add a new welcome message..."
                        className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newCustomMessage.trim()) {
                              addCustomMessage(newCustomMessage.trim());
                              setNewCustomMessage('');
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (newCustomMessage.trim()) {
                            addCustomMessage(newCustomMessage.trim());
                            setNewCustomMessage('');
                          }
                        }}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Custom messages list */}
                    {customMessages.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-neutral-300">Your Custom Messages</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {customMessages.map((message: string, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-neutral-800 rounded border border-neutral-700">
                              <span className="text-sm text-neutral-300 flex-1">{message}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCustomMessage(message)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-neutral-500">
                      Your custom messages are saved locally and will be available across all chatbots.
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-2">
              {(Array.isArray(field.value) ? field.value : []).map((message: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <Textarea
                    value={message}
                    onChange={(e) => {
                      const messages = Array.isArray(field.value) ? field.value : [];
                      const newMessages = [...messages];
                      newMessages[index] = e.target.value;
                      field.onChange(newMessages);
                    }}
                    placeholder="Enter a welcome message"
                    className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary resize-none"
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      // Don't allow removing the last message
                      const messages = Array.isArray(field.value) ? field.value : [];
                      if (messages.length <= 1) return;
                      
                      const newMessages = [...messages];
                      newMessages.splice(index, 1);
                      field.onChange(newMessages);
                    }}
                    className="h-8 w-8 text-neutral-400 hover:text-red-500"
                    disabled={(Array.isArray(field.value) ? field.value.length : 0) <= 1}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
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
                <PlusCircle className="mr-1 h-3 w-3" /> Add Custom Message
              </Button>
            </div>
            <FormDescription className="text-neutral-500 text-xs">
              Use the dropdown above to quickly add common welcome messages, or click "Add Custom Message" to write your own. 
              Multiple messages add variety for returning users.
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
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={question}
                    onChange={(e) => {
                      const newQuestions = [...field.value];
                      newQuestions[index] = e.target.value;
                      field.onChange(newQuestions);
                    }}
                    className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newQuestions = [...field.value];
                      newQuestions.splice(index, 1);
                      field.onChange(newQuestions);
                    }}
                    className="h-8 w-8 text-neutral-400 hover:text-red-500"
                  >
                    <XCircle className="h-4 w-4" />
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
