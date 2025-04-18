import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { getQueryFn } from "@/lib/queryClient";

// Type for OpenAI API key status response
interface ApiKeyStatus {
  valid: boolean;
  message: string;
  models?: string[];
}

export default function SettingsPage() {
  const { toast } = useToast();
  
  // Query for OpenAI API key status
  const {
    data: apiKeyStatus,
    isLoading: isLoadingApiKey,
    isError: isApiKeyError,
    refetch: refetchApiKey,
    isRefetching: isRefetchingApiKey
  } = useQuery<ApiKeyStatus>({
    queryKey: ["/api/settings/openai"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-black">Settings</h1>
          <p className="text-neutral-600">Manage your Aidify settings and API integrations</p>
        </div>
        
        <Separator />
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span>OpenAI API Key</span>
                {apiKeyStatus?.valid && (
                  <Badge variant="secondary" className="ml-2 bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/30">
                    Active
                  </Badge>
                )}
                {apiKeyStatus?.valid === false && (
                  <Badge variant="destructive" className="ml-2">
                    Inactive
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Used for all AI-powered features in Aidify
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingApiKey && !isRefetchingApiKey ? (
                <div className="flex items-center space-x-2 text-sm text-neutral-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking API key status...</span>
                </div>
              ) : isApiKeyError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Could not check API key status. Please try again later.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert variant={apiKeyStatus?.valid ? "default" : "destructive"}>
                    {apiKeyStatus?.valid ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {apiKeyStatus?.valid ? "API Key Status" : "Attention Required"}
                    </AlertTitle>
                    <AlertDescription>
                      {apiKeyStatus?.message}
                    </AlertDescription>
                  </Alert>
                  
                  {apiKeyStatus?.models && apiKeyStatus.models.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Available Models</h4>
                      <div className="flex flex-wrap gap-2">
                        {apiKeyStatus.models.map((model: string) => (
                          <Badge key={model} variant="outline" className="text-xs">
                            {model}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                onClick={() => refetchApiKey()}
                variant="outline"
                size="sm"
                disabled={isRefetchingApiKey}
              >
                {isRefetchingApiKey ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check Status
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}