import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { loginSchema } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Brain } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginFormSchema = loginSchema;
const registerFormSchema = loginSchema;

type LoginFormValues = z.infer<typeof loginFormSchema>;
type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("login");

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync(data);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      await registerMutation.mutateAsync(data);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader size="lg" variant="primary" withText text="Loading..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Column - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center justify-center">
              <MessageSquare className="mr-2 h-8 w-8 text-primary" />
              RAG Builder
            </h1>
            <p className="text-neutral-400 mt-2">Create custom AI chatbots powered by your documents</p>
          </div>

          <Card className="border-neutral-800 bg-background-light">
            <CardHeader>
              <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 bg-neutral-900">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <CardTitle className="text-xl text-white">Welcome back</CardTitle>
                  <CardDescription className="text-neutral-400">
                    Login to access your chatbots
                  </CardDescription>
                </TabsContent>
                
                <TabsContent value="register">
                  <CardTitle className="text-xl text-white">Create an account</CardTitle>
                  <CardDescription className="text-neutral-400">
                    Sign up to start building AI chatbots
                  </CardDescription>
                </TabsContent>
              </Tabs>
            </CardHeader>
            
            <CardContent>
              <div className={activeTab === "login" ? "block" : "hidden"}>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-neutral-300">Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your username"
                              className="bg-neutral-800 border-neutral-700 text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-neutral-300">Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your password"
                              className="bg-neutral-800 border-neutral-700 text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary-dark"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader size="sm" className="mr-2" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
              
              <div className={activeTab === "register" ? "block" : "hidden"}>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-neutral-300">Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Choose a username"
                              className="bg-neutral-800 border-neutral-700 text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-neutral-300">Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Create a password"
                              className="bg-neutral-800 border-neutral-700 text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary-dark"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader size="sm" className="mr-2" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-center border-t border-neutral-800 pt-4">
              <p className="text-sm text-neutral-400">
                {activeTab === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <Button
                      variant="link"
                      className="p-0 text-primary"
                      onClick={() => setActiveTab("register")}
                    >
                      Sign up
                    </Button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <Button
                      variant="link"
                      className="p-0 text-primary"
                      onClick={() => setActiveTab("login")}
                    >
                      Log in
                    </Button>
                  </>
                )}
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* Right Column - Hero */}
      <div className="hidden lg:flex flex-1 bg-background-light border-l border-neutral-800">
        <div className="flex flex-col items-center justify-center p-12 text-center max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="inline-block p-4 bg-primary/10 rounded-full mb-6">
              <Brain className="h-16 w-16 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Create AI Chatbots with Your Documents
            </h2>
            <p className="text-neutral-400 text-lg leading-relaxed">
              Build powerful conversational AI assistants powered by OpenAI's models and your own content.
              No coding required.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div className="bg-background p-6 rounded-lg border border-neutral-800">
              <div className="bg-primary/10 p-2 rounded-full w-10 h-10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Document Powered</h3>
              <p className="text-neutral-400">
                Upload PDFs, DOCXs, and TXT files to create chatbots that can answer questions based on your content.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border border-neutral-800">
              <div className="bg-primary/10 p-2 rounded-full w-10 h-10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">OpenAI Models</h3>
              <p className="text-neutral-400">
                Choose from various OpenAI models, customize behavior, and fine-tune responses for your specific needs.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border border-neutral-800">
              <div className="bg-primary/10 p-2 rounded-full w-10 h-10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Easy Sharing</h3>
              <p className="text-neutral-400">
                Share your chatbots with a unique link or embed them directly into your website.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border border-neutral-800">
              <div className="bg-primary/10 p-2 rounded-full w-10 h-10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Customizable</h3>
              <p className="text-neutral-400">
                Configure behavior rules, fallback responses, and model parameters to tailor your chatbot's experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
