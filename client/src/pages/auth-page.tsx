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
  const [showPassword, setShowPassword] = useState(false);

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

  const handleDevLogin = async () => {
    const devUser = {
      username: "dev",
      password: "password"
    };
    
    // Try to login first (reverses the previous approach)
    try {
      await loginMutation.mutateAsync(devUser);
    } catch (error) {
      // If login fails, try to register
      try {
        await registerMutation.mutateAsync(devUser);
      } catch (innerError) {
        console.error("Dev login/register failed", innerError);
      }
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
      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-2">
              <img src="/assets/aidify-logo.png" alt="Aidify Logo" className="h-24" />
            </div>
            <p className="text-neutral-400 mt-4">Create custom AI chatbots powered by your documents</p>
          </div>

          <Card className="border border-neutral-200/10 bg-white/5 shadow-lg backdrop-blur-sm">
            <CardHeader>
              <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 bg-black/20">
                  <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-white">Login</TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-white">Register</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <CardTitle className="text-xl text-white">Welcome back</CardTitle>
                  <CardDescription className="text-neutral-300">
                    Login to access your chatbots
                  </CardDescription>
                </TabsContent>
                
                <TabsContent value="register">
                  <CardTitle className="text-xl text-white">Create an account</CardTitle>
                  <CardDescription className="text-neutral-300">
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
                              className="bg-white/10 border-neutral-600/30 text-white placeholder:text-neutral-400"
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
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                className="bg-white/10 border-neutral-600/30 text-white placeholder:text-neutral-400 pr-10"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 text-neutral-400 hover:text-neutral-300"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:opacity-90 text-white shadow-md"
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
                    
                    <div className="mt-4 pt-4 border-t border-neutral-600/20">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-neutral-600/30 text-neutral-300 hover:bg-white/5 transition-colors"
                        onClick={handleDevLogin}
                      >
                        Quick Dev Login (username: dev)
                      </Button>
                    </div>
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
                              className="bg-white/10 border-neutral-600/30 text-white placeholder:text-neutral-400"
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
                              className="bg-white/10 border-neutral-600/30 text-white placeholder:text-neutral-400"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:opacity-90 text-white shadow-md"
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

                    <div className="mt-4 pt-4 border-t border-neutral-600/20">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-neutral-600/30 text-neutral-300 hover:bg-white/5 transition-colors"
                        onClick={handleDevLogin}
                      >
                        Quick Dev Login (username: dev)
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-center border-t border-neutral-600/20 pt-4">
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
    </div>
  );
}