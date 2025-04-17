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
import { PlusCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";

export default function BasicSetup() {
  const form = useFormContext();
  const [newQuestion, setNewQuestion] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(
    form.getValues().suggestedQuestions || []
  );
  
  // Initialize form value if it doesn't exist
  useEffect(() => {
    if (!form.getValues().suggestedQuestions) {
      form.setValue('suggestedQuestions', []);
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
                  <option value="gpt4o">GPT-4o (Latest & Most Capable)</option>
                  <option value="gpt4-1">GPT-4.1 (Very Capable)</option>
                  <option value="gpt4o-mini">GPT-4o Mini (Fast & Efficient)</option>
                </optgroup>
                <optgroup label="GPT-4 Family">
                  <option value="gpt4">GPT-4 (Stable)</option>
                  <option value="gpt4-1-nano">GPT-4.1 Nano (Compact)</option>
                  <option value="gpt4-mini">GPT-4.1 Mini (Balanced)</option>
                </optgroup>
                <optgroup label="GPT-3 Family">
                  <option value="gpt35turbo">GPT-3.5 Turbo (Recommended)</option>
                  <option value="gpt3-mini">GPT-3 Mini (Fastest)</option>
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

      <div>
        <FormLabel className="text-neutral-300">Suggested Questions</FormLabel>
        <div className="mt-2 mb-1">
          <FormDescription className="text-neutral-500 text-xs">
            Add suggested questions for users to click on when they first interact with your chatbot.
          </FormDescription>
        </div>
        
        {/* Input for adding new questions */}
        <div className="flex gap-2 mb-3">
          <Input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Enter a suggested question"
            className="flex-1 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSuggestedQuestion();
              }
            }}
          />
          <Button 
            onClick={addSuggestedQuestion}
            type="button"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <PlusCircle className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        
        {/* List of added questions */}
        {suggestedQuestions.length > 0 ? (
          <div className="space-y-2 mt-2">
            {suggestedQuestions.map((question, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 rounded-md bg-neutral-800 border border-neutral-700 group"
              >
                <span className="text-sm text-white">{question}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSuggestedQuestion(index)}
                  className="opacity-70 hover:opacity-100 hover:bg-transparent text-white hover:text-red-500"
                  type="button"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-4 border border-dashed border-neutral-700 rounded-md">
            <p className="text-neutral-400 text-sm">No suggested questions added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
