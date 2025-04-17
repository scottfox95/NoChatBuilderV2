import { useFormContext } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormDescription, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { BehaviorRule } from "@shared/schema";

export default function Behavior() {
  const form = useFormContext();
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "behaviorRules",
  });

  const addRule = () => {
    append({ condition: "", response: "" });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">Message Behavior Rules</h3>
          <Button 
            onClick={addRule} 
            variant="outline" 
            size="sm"
            className="bg-transparent border-neutral-700 hover:bg-neutral-800 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        </div>
        
        <p className="text-neutral-400 text-sm mb-6">
          Define how your chatbot should respond in specific situations. 
          For example, you can set rules for handling profanity, off-topic questions, or specific keywords.
        </p>
        
        {fields.length === 0 ? (
          <div className="bg-neutral-800 rounded-lg p-6 text-center">
            <p className="text-neutral-400">
              No behavior rules defined yet. Add your first rule to customize your chatbot's responses.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="border border-neutral-800 rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-white">Rule {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="h-8 w-8 text-neutral-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <FormField
                  control={form.control}
                  name={`behaviorRules.${index}.condition`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-neutral-300">Condition</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., profanity, swear words, help, pricing" 
                          className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-neutral-500 text-xs">
                        When a user message contains this text (case insensitive)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name={`behaviorRules.${index}.response`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-neutral-300">Response</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., I don't respond to that kind of language" 
                          className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-neutral-500 text-xs">
                        The chatbot will respond with this message
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
