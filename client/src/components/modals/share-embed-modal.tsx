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
  careAidSlug: string;
}

export default function ShareEmbedModal({ isOpen, onClose, careAidSlug: chatbotSlug }: ShareEmbedModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [directLinkValue, setDirectLinkValue] = useState("");
  const [embedLinkValue, setEmbedLinkValue] = useState("");
  const [widgetScriptValue, setWidgetScriptValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Get the hostname from the window location
      const hostname = window.location.origin;
      
      // Set the direct link (using the public route that doesn't show dashboard navigation)
      const directLink = `${hostname}/public/care-aid/${chatbotSlug}`;
      setDirectLinkValue(directLink);
      
      // Set the embed iframe code (using public routes)
      const embedLink = `<iframe src="${hostname}/public/care-aid/${chatbotSlug}" width="100%" height="600px" style="border:none;border-radius:8px;" allow="microphone"></iframe>`;
      setEmbedLinkValue(embedLink);
      
      // Set the widget script code
      const widgetScript = `<script src="${hostname}/widget.js" data-care-aid-id="${chatbotSlug}"></script>`;
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
      <DialogContent className="sm:max-w-[600px] bg-white text-gray-800 border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-800">Share Care Aid</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="link" className="w-full mt-4">
          <TabsList className="grid grid-cols-3 mb-4 bg-gray-100">
            <TabsTrigger value="link" className="data-[state=active]:bg-white data-[state=active]:text-pink-500">Direct Link</TabsTrigger>
            <TabsTrigger value="embed" className="data-[state=active]:bg-white data-[state=active]:text-pink-500">Embed</TabsTrigger>
            <TabsTrigger value="widget" className="data-[state=active]:bg-white data-[state=active]:text-pink-500">Widget</TabsTrigger>
          </TabsList>
          
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="direct-link" className="text-gray-700">Share this link with others</Label>
              <div className="flex">
                <Input
                  id="direct-link"
                  value={directLinkValue}
                  readOnly
                  className="flex-1 rounded-r-none border-gray-300 text-gray-800 bg-gray-50"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-l-none bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
                  onClick={() => handleCopyToClipboard(directLinkValue, 'Direct link')}
                >
                  {copied === 'Direct link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Anyone with this link can view and interact with your Care Aid.
              </p>
              
              <div className="mt-4 flex">
                <Button
                  type="button"
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                  onClick={() => window.open(directLinkValue, '_blank')}
                >
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  Open Public Chat
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="embed" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="embed-code" className="text-gray-700">Embed code for your website</Label>
              <div className="flex">
                <Input
                  id="embed-code"
                  value={embedLinkValue}
                  readOnly
                  className="flex-1 rounded-r-none border-gray-300 text-gray-800 bg-gray-50"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-l-none bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
                  onClick={() => handleCopyToClipboard(embedLinkValue, 'Embed code')}
                >
                  {copied === 'Embed code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Add this code to embed the Care Aid directly in your website.
              </p>
            </div>
            
            <div className="border rounded-md p-4 bg-gray-50 border-gray-200 relative">
              <div className="absolute top-3 right-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  onClick={() => handleCopyToClipboard(embedLinkValue, 'Embed code')}
                >
                  {copied === 'Embed code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="font-mono text-sm text-gray-700 whitespace-pre-wrap break-all">
                {embedLinkValue}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="widget" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="widget-code" className="text-gray-700">Add a chat widget to your website</Label>
              <div className="flex">
                <Input
                  id="widget-code"
                  value={widgetScriptValue}
                  readOnly
                  className="flex-1 rounded-r-none border-gray-300 text-gray-800 bg-gray-50"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-l-none bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
                  onClick={() => handleCopyToClipboard(widgetScriptValue, 'Widget code')}
                >
                  {copied === 'Widget code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Add this code to your website to create a chat widget that visitors can open and close.
              </p>
            </div>
            
            <div className="border rounded-md p-4 bg-gray-50 border-gray-200 relative">
              <div className="absolute top-3 right-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  onClick={() => handleCopyToClipboard(widgetScriptValue, 'Widget code')}
                >
                  {copied === 'Widget code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="font-mono text-sm text-gray-700 whitespace-pre-wrap break-all">
                {widgetScriptValue}
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-pink-50 border border-pink-100 rounded-md">
              <Code className="h-5 w-5 mr-2 text-pink-500" />
              <p className="text-sm text-gray-700">
                Place this script at the end of your {'<body>'} tag for best performance.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}