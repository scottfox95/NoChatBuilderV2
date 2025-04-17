import { useState, useEffect, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Document } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, FileText, FileArchive, File } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";

export default function Knowledge() {
  const form = useFormContext();
  const chatbotId = form.getValues("id");
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: [`/api/chatbots/${chatbotId}/documents`],
    enabled: !!chatbotId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`/api/chatbots/${chatbotId}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload document");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${chatbotId}/documents`] });
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded and processed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${chatbotId}/documents`] });
      toast({
        title: "Document deleted",
        description: "The document has been removed from your chatbot.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (selectedFile) {
      try {
        await uploadMutation.mutateAsync(selectedFile);
      } catch (error) {
        // Error is handled in the mutation
      }
    }
  };

  const handleDelete = async (documentId: number) => {
    try {
      await deleteMutation.mutateAsync(documentId);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  const getFileIcon = (type: string) => {
    switch(type) {
      case "pdf":
        return <FileText className="text-primary-light" />;
      case "docx":
        return <FileArchive className="text-primary-light" />;
      default:
        return <File className="text-primary-light" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  if (!chatbotId) {
    return (
      <div className="bg-neutral-800 rounded-lg p-6 text-center">
        <p className="text-neutral-400">
          Save the basic chatbot information first to enable document uploads.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200",
          isDragging 
            ? "border-primary bg-primary/10" 
            : "border-neutral-700 bg-neutral-900 hover:border-neutral-600"
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isDragging) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
          }
        }}
      >
        <div className="space-y-4">
          <Upload className={cn(
            "h-10 w-10 mx-auto transition-colors duration-200",
            isDragging ? "text-primary animate-pulse" : "text-neutral-500"
          )} />
          <h3 className={cn(
            "text-lg font-medium",
            isDragging ? "text-primary" : "text-white"
          )}>
            {isDragging ? "Drop your file here" : "Drag files here or click to upload"}
          </h3>
          <p className="text-neutral-400 text-sm">Supports PDF, DOCX, and TXT files (max 10MB per file)</p>
          <div className="flex justify-center space-x-4">
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <Button 
              disabled={uploading} 
              variant="outline" 
              className="bg-transparent border-neutral-700 hover:bg-neutral-800 text-white"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Choose File
            </Button>
            {selectedFile && (
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-primary hover:bg-primary-dark text-white"
              >
                {uploading ? (
                  <>
                    <Loader size="sm" className="mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            )}
          </div>
          {selectedFile && (
            <p className="text-sm text-neutral-300">Selected: {selectedFile.name}</p>
          )}
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-neutral-300 mb-3">Uploaded Documents</h4>
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader withText text="Loading documents..." />
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="bg-neutral-800 rounded-lg p-4 text-center">
            <p className="text-neutral-400 text-sm">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-neutral-800 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-primary/20 p-2 rounded">
                    {getFileIcon(doc.type)}
                  </div>
                  <div className="ml-3">
                    <p className="text-white text-sm font-medium">{doc.name}</p>
                    <p className="text-neutral-500 text-xs">{formatFileSize(doc.size)}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-neutral-400 hover:text-red-500" 
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader size="sm" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
