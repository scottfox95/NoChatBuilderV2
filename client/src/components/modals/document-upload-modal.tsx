import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Upload, File, FileText, FileArchive, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Document } from "@shared/schema";
import { Loader } from "@/components/ui/loader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: number;
}

export default function DocumentUploadModal({ isOpen, onClose, chatbotId }: DocumentUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: [`/api/chatbots/${chatbotId}/documents`],
    enabled: isOpen && !!chatbotId,
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
    if (event.target.files && event.target.files.length > 0) {
      const filesArray = Array.from(event.target.files);
      setSelectedFiles(filesArray);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length > 0) {
      try {
        setUploadProgress(0);
        
        // Upload files one by one
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          await uploadMutation.mutateAsync(file);
          
          // Update progress
          setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
        }
        
        // Clear selection after all uploads complete
        setSelectedFiles([]);
        setUploadProgress(0);
        
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

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (type: string) => {
    switch(type) {
      case "pdf":
        return <FileText className="text-primary-light" />;
      case "docx":
        return <FileArchive className="text-primary-light" />;
      case "rtf":
        return <FileText className="text-primary-light" />;
      default:
        return <File className="text-primary-light" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-background-light border-neutral-800">
        <DialogHeader className="p-6 border-b border-neutral-800">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold text-white">
              Upload Knowledge Base Documents
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        
        <div className="p-6">
          <div 
            className="border-2 border-dashed border-neutral-700 rounded-lg p-8 text-center bg-neutral-900"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                // Filter for supported file types
                const validFileTypes = [".pdf", ".docx", ".txt", ".rtf"];
                const filesArray = Array.from(e.dataTransfer.files).filter(file => {
                  const ext = "." + file.name.split('.').pop()?.toLowerCase();
                  return validFileTypes.includes(ext);
                });
                setSelectedFiles(filesArray);
              }
            }}
          >
            <div className="space-y-4">
              <Upload className="h-14 w-14 mx-auto text-neutral-500" />
              <h3 className="text-lg font-medium text-white">Drag files here or click to upload</h3>
              <p className="text-neutral-400 text-sm">Supports PDF, DOCX, TXT, and RTF files (max 10MB per file)</p>
              <div className="flex justify-center space-x-4">
                <Button 
                  onClick={openFileSelector}
                  disabled={uploading}
                  variant="outline"
                  className="border-neutral-700 hover:bg-neutral-800 text-white"
                >
                  Choose Files
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.docx,.txt,.rtf,application/rtf,text/rtf"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </Button>
                {selectedFiles.length > 0 && (
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="bg-primary hover:bg-primary-dark text-white"
                  >
                    {uploading ? (
                      <>
                        <Loader size="sm" className="mr-2" />
                        Uploading... {uploadProgress > 0 && `(${uploadProgress}%)`}
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'}
                      </>
                    )}
                  </Button>
                )}
              </div>
              {selectedFiles.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto bg-neutral-800 rounded-md p-2">
                  <div className="space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-sm text-neutral-300 p-1 hover:bg-neutral-700 rounded">
                        <div className="flex items-center space-x-2">
                          <span>{getFileIcon(file.name.split('.').pop() || '')}</span>
                          <span className="truncate max-w-xs">{file.name}</span>
                          <span className="text-xs text-neutral-500">{formatFileSize(file.size)}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-200"
                          onClick={() => {
                            const newFiles = [...selectedFiles];
                            newFiles.splice(index, 1);
                            setSelectedFiles(newFiles);
                          }}
                          disabled={uploading}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6">
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
          
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} className="bg-primary hover:bg-primary-dark text-white">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
