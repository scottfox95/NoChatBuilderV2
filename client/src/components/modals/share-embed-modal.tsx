import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatbotSlug: string;
}

export default function ShareEmbedModal({ isOpen, onClose, chatbotSlug }: ShareEmbedModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [directLinkValue, setDirectLinkValue] = useState("");
  const [embedLinkValue, setEmbedLinkValue] = useState("");
  const [widgetScriptValue, setWidgetScriptValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Get the hostname from the window location
      const hostname = window.location.origin;
      
      // Set the direct link
      const directLink = `${hostname}/chatbot/${chatbotSlug}`;
      setDirectLinkValue(directLink);
      
      // Set the embed iframe code
      const embedLink = `<iframe src="${hostname}/embed/${chatbotSlug}" width="100%" height="600px" style="border:none;border-radius:8px;" allow="microphone"></iframe>`;
      setEmbedLinkValue(embedLink);
      
      // Set the widget script code
      const widgetScript = `<script src="${hostname}/widget.js" data-chatbot-id="${chatbotSlug}"></script>`;
      setWidgetScriptValue(widgetScript);
    } else {
      setCopied(null);
    }
  }, [isOpen, chatbotSlug]);
  
  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
        toast({
          title: "Copied to clipboard",
          description: `${type} has been copied to your clipboard.`,
        });
      })
      .catch((error) => {
        console.error("Copy failed:", error);
        toast({
          title: "Copy failed",
          description: "Failed to copy to clipboard. Please try again.",
          variant: "destructive",
        });
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Share Chatbot</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="link" className="w-full mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="link">Direct Link</TabsTrigger>
            <TabsTrigger value="embed">Embed</TabsTrigger>
            <TabsTrigger value="widget">Widget</TabsTrigger>
          </TabsList>
          
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="direct-link">Share this link with others</Label>
              <div className="flex">
                <Input
                  id="direct-link"
                  value={directLinkValue}
                  readOnly
                  className="flex-1 rounded-r-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-l-none"
                  onClick={() => handleCopyToClipboard(directLinkValue, 'Direct link')}
                >
                  {copied === 'Direct link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Anyone with this link can view and interact with your chatbot.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="embed" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="embed-code">Embed code for your website</Label>
              <div className="flex">
                <Input
                  id="embed-code"
                  value={embedLinkValue}
                  readOnly
                  className="flex-1 rounded-r-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-l-none"
                  onClick={() => handleCopyToClipboard(embedLinkValue, 'Embed code')}
                >
                  {copied === 'Embed code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Add this code to embed the chatbot directly in your website.
              </p>
            </div>
            
            <div className="border rounded-md p-4 bg-neutral-900 relative">
              <div className="absolute top-3 right-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleCopyToClipboard(embedLinkValue, 'Embed code')}
                >
                  {copied === 'Embed code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="font-mono text-sm text-neutral-400 whitespace-pre-wrap break-all">
                {embedLinkValue}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="widget" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="widget-code">Add a chat widget to your website</Label>
              <div className="flex">
                <Input
                  id="widget-code"
                  value={widgetScriptValue}
                  readOnly
                  className="flex-1 rounded-r-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-l-none"
                  onClick={() => handleCopyToClipboard(widgetScriptValue, 'Widget code')}
                >
                  {copied === 'Widget code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Add this code to your website to create a chat widget that visitors can open and close.
              </p>
            </div>
            
            <div className="border rounded-md p-4 bg-neutral-900 relative">
              <div className="absolute top-3 right-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleCopyToClipboard(widgetScriptValue, 'Widget code')}
                >
                  {copied === 'Widget code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="font-mono text-sm text-neutral-400 whitespace-pre-wrap break-all">
                {widgetScriptValue}
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-primary/10 border border-primary/20 rounded-md">
              <Code className="h-5 w-5 mr-2 text-primary" />
              <p className="text-sm">
                Place this script at the end of your {'<body>'} tag for best performance.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}