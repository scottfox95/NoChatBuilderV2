import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Download, Copy, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ShareEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatbotSlug: string;
}

export default function ShareEmbedModal({ isOpen, onClose, chatbotSlug }: ShareEmbedModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://yourdomain.com';
  
  const chatbotUrl = `${baseUrl}/chatbot/${chatbotSlug}`;
  const iframeCode = `<iframe src="${chatbotUrl}/embed" 
  width="100%" height="600px" frameborder="0"></iframe>`;
  const widgetCode = `<script src="${baseUrl}/widget.js" 
  data-chatbot-id="${chatbotSlug}"></script>`;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      });
      
      setTimeout(() => {
        setCopied(null);
      }, 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again or copy manually",
        variant: "destructive",
      });
    }
  };
  
  const generateQRCode = async () => {
    // In a real implementation, we would generate a QR code here
    // For now, we'll just show a toast notification
    toast({
      title: "QR Code Generation",
      description: "QR Code generation would be implemented in production",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-background-light border-neutral-800">
        <DialogHeader className="p-6 border-b border-neutral-800">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold text-white">
              Share Your Chatbot
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          {/* Public Link */}
          <div>
            <h3 className="text-sm font-medium text-neutral-300 mb-2">Public Link</h3>
            <div className="flex">
              <Input
                value={chatbotUrl}
                readOnly
                className="flex-1 bg-neutral-800 border-neutral-700 text-white rounded-r-none"
              />
              <Button
                onClick={() => copyToClipboard(chatbotUrl, "Public Link")}
                className="bg-neutral-700 hover:bg-neutral-600 text-white rounded-l-none"
              >
                {copied === "Public Link" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Share this link directly with your users.</p>
          </div>
          
          {/* Embed Code */}
          <div>
            <h3 className="text-sm font-medium text-neutral-300 mb-2">Embed on Your Website</h3>
            <div className="bg-neutral-900 p-4 rounded-lg relative">
              <pre className="text-neutral-300 text-xs overflow-x-auto whitespace-pre-wrap">{iframeCode}</pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 text-neutral-400 hover:text-white"
                onClick={() => copyToClipboard(iframeCode, "Embed Code")}
              >
                {copied === "Embed Code" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Add this code to your website to embed the chatbot.</p>
          </div>
          
          {/* Chat Widget */}
          <div>
            <h3 className="text-sm font-medium text-neutral-300 mb-2">Chat Widget (Pop-up)</h3>
            <div className="bg-neutral-900 p-4 rounded-lg relative">
              <pre className="text-neutral-300 text-xs overflow-x-auto whitespace-pre-wrap">{widgetCode}</pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 text-neutral-400 hover:text-white"
                onClick={() => copyToClipboard(widgetCode, "Widget Code")}
              >
                {copied === "Widget Code" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Add this script to show a chat bubble in the corner of your website.</p>
          </div>
          
          {/* QR Code */}
          <div>
            <h3 className="text-sm font-medium text-neutral-300 mb-2">QR Code</h3>
            <div className="flex items-center">
              <div className="bg-white p-4 rounded-lg inline-block">
                <div className="bg-neutral-100 w-32 h-32 flex items-center justify-center">
                  <svg className="w-16 h-16 text-neutral-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
              </div>
              <Button 
                onClick={generateQRCode} 
                className="ml-4 bg-neutral-700 hover:bg-neutral-600 text-white"
              >
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
