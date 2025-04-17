import { useFormContext } from "react-hook-form";
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormDescription, 
  FormMessage 
} from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function Intelligence() {
  const form = useFormContext();

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Model Settings</h3>
        
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="temperature"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-center mb-2">
                  <FormLabel className="text-neutral-300">Temperature</FormLabel>
                  <span className="text-neutral-300 text-sm">{field.value / 100}</span>
                </div>
                <FormControl>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                    className="py-4"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>More Predictable</span>
                  <span>More Random</span>
                </div>
                <FormDescription className="text-neutral-500 text-xs mt-2">
                  Controls the randomness of the responses. Higher values make the output more creative but potentially less accurate.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="maxTokens"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-neutral-300">Maximum Response Length</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min={50}
                    max={4000}
                    className="bg-neutral-800 border-neutral-700 text-white focus:ring-primary"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription className="text-neutral-500 text-xs">
                  Maximum number of tokens (words) for each response. Higher values allow longer responses.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Retrieval-Augmented Generation</h3>
        
        <FormField
          control={form.control}
          name="ragEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-neutral-800 p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base text-white">Use Document Knowledge</FormLabel>
                <FormDescription className="text-neutral-500">
                  Allow the chatbot to search through uploaded documents to answer questions.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="fallbackResponse"
          render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel className="text-neutral-300">Fallback Response</FormLabel>
              <FormControl>
                <Input 
                  placeholder="I'm sorry, I don't have enough information to answer that question."
                  className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary"
                  {...field} 
                />
              </FormControl>
              <FormDescription className="text-neutral-500 text-xs">
                This response will be used when the chatbot cannot find relevant information.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
