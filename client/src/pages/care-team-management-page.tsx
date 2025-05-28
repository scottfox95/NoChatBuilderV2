import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Settings, Trash2, Users, Shield } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layouts/dashboard-layout";

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["careteam", "admin"])
});

type CreateUserValues = z.infer<typeof createUserSchema>;

interface User {
  id: number;
  username: string;
  role: string;
}

interface Chatbot {
  id: number;
  name: string;
}

export default function CareTeamManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedChatbots, setSelectedChatbots] = useState<number[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("careteam");

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      role: activeTab as "careteam" | "admin"
    },
  });

  // Fetch users by role
  const { data: careTeamUsers = [], isLoading: isLoadingCareTeam } = useQuery<User[]>({
    queryKey: ["/api/admin/users/careteam"],
    retry: false,
  });

  const { data: adminUsers = [], isLoading: isLoadingAdmins } = useQuery<User[]>({
    queryKey: ["/api/admin/users/admin"],
    retry: false,
  });

  // Fetch all chatbots for assignment
  const { data: chatbots = [], isLoading: isLoadingChatbots } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
    retry: false,
  });

  // Fetch assignments for selected user (only for care team users)
  const { data: userAssignments = [], refetch: refetchAssignments } = useQuery<Chatbot[]>({
    queryKey: ["/api/care-team/assignments", selectedUserId],
    enabled: !!selectedUserId && activeTab === "careteam",
    retry: false,
  });

  // Create user mutation using the working register endpoint
  const createUserMutation = useMutation({
    mutationFn: async (values: CreateUserValues) => {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/careteam"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/admin"] });
      form.reset();
      toast({
        title: "Success",
        description: `${form.getValues("role") === "admin" ? "Admin" : "Care Team"} user created successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/careteam"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/admin"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Assign chatbot mutation
  const assignChatbotMutation = useMutation({
    mutationFn: async ({ userId, chatbotId }: { userId: number; chatbotId: number }) => {
      const response = await fetch("/api/admin/care-team/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, chatbotId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign Care Aid");
      }
      return response.json();
    },
    onSuccess: () => {
      refetchAssignments();
      toast({
        title: "Success",
        description: "Care Aid assigned successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign Care Aid",
        variant: "destructive",
      });
    },
  });

  // Remove assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: async ({ userId, chatbotId }: { userId: number; chatbotId: number }) => {
      const response = await fetch(`/api/admin/care-team/assignments/${userId}/${chatbotId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove assignment");
      }
      return response.ok;
    },
    onSuccess: () => {
      refetchAssignments();
      toast({
        title: "Success",
        description: "Care Aid assignment removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove assignment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: CreateUserValues) => {
    createUserMutation.mutate(values);
  };

  // Get assigned chatbot IDs
  const getAssignedChatbotIds = () => {
    return userAssignments.map((chatbot: any) => chatbot.id);
  };

  // Check if a chatbot is already assigned
  const isChatbotAssigned = (chatbotId: number) => {
    return getAssignedChatbotIds().includes(chatbotId);
  };

  // Handle chatbot assignment
  const handleAssignChatbots = () => {
    if (!selectedUserId) return;

    const currentlyAssigned = getAssignedChatbotIds();
    const toAssign = selectedChatbots.filter(id => !currentlyAssigned.includes(id));
    const toRemove = currentlyAssigned.filter((id: number) => !selectedChatbots.includes(id));

    // Assign new chatbots
    toAssign.forEach(chatbotId => {
      assignChatbotMutation.mutate({ userId: selectedUserId, chatbotId });
    });

    // Remove unselected chatbots
    toRemove.forEach((chatbotId: number) => {
      removeAssignmentMutation.mutate({ userId: selectedUserId, chatbotId });
    });

    setIsAssignDialogOpen(false);
    setSelectedUserId(null);
    setSelectedChatbots([]);
  };

  const currentUsers = activeTab === "careteam" ? careTeamUsers : adminUsers;
  const isLoadingUsers = activeTab === "careteam" ? isLoadingCareTeam : isLoadingAdmins;

  // Update form role when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    form.setValue("role", value as "careteam" | "admin");
    setSelectedUserId(null);
    setSelectedChatbots([]);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black mb-1">User Management</h1>
            <p className="text-neutral-500">
              Create and manage Admin and Care Team users and their access to patient care aids
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="careteam" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Care Team Users
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="careteam" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create Care Team User Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Create Care Team User
                  </CardTitle>
                  <CardDescription>
                    Add a new Care Team member who can access assigned patient care aids
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter username" className="bg-[#f4f4f4]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter password" className="bg-[#f4f4f4]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        Create Care Team User
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Care Team Users List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Care Team Users</CardTitle>
                  <CardDescription>
                    Manage Care Team members and their access to patient care aids
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center p-6">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : !currentUsers.length ? (
                    <div className="text-center py-6 text-neutral-500">
                      No Care Team users found. Create one to get started.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Assigned Care Aids</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentUsers.map((user: User) => (
                          <TableRow key={user.id} className={user.id === selectedUserId ? "bg-primary/10" : ""}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8 bg-primary text-white">
                                  <AvatarFallback className="bg-primary text-white text-sm">
                                    {getInitials(user.username)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-black">{user.username}</div>
                                  <Badge variant="secondary" className="text-xs">
                                    Care Team
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {selectedUserId === user.id ? (
                                <div className="flex flex-wrap gap-1">
                                  {userAssignments.map((chatbot: Chatbot) => (
                                    <Badge key={chatbot.id} variant="outline" className="text-xs">
                                      {chatbot.name}
                                    </Badge>
                                  ))}
                                  {userAssignments.length === 0 && (
                                    <span className="text-neutral-500 text-sm">No assignments</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-neutral-500 text-sm">Click to view</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Dialog open={isAssignDialogOpen && selectedUserId === user.id} onOpenChange={setIsAssignDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        setSelectedUserId(user.id);
                                        setSelectedChatbots(getAssignedChatbotIds());
                                      }}
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Manage Care Aid Access</DialogTitle>
                                      <DialogDescription>
                                        Select which Care Aids {user.username} can access
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      {isLoadingChatbots ? (
                                        <div className="flex items-center justify-center p-6">
                                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        </div>
                                      ) : (
                                        <div className="space-y-3 max-h-60 overflow-y-auto">
                                          {chatbots.map((chatbot: Chatbot) => (
                                            <div key={chatbot.id} className="flex items-center space-x-2">
                                              <Checkbox
                                                id={`chatbot-${chatbot.id}`}
                                                checked={selectedChatbots.includes(chatbot.id)}
                                                onCheckedChange={(checked) => {
                                                  if (checked) {
                                                    setSelectedChatbots([...selectedChatbots, chatbot.id]);
                                                  } else {
                                                    setSelectedChatbots(selectedChatbots.filter(id => id !== chatbot.id));
                                                  }
                                                }}
                                              />
                                              <label 
                                                htmlFor={`chatbot-${chatbot.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                              >
                                                {chatbot.name}
                                              </label>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <div className="flex justify-end space-x-2 pt-4">
                                        <Button 
                                          variant="outline" 
                                          onClick={() => {
                                            setIsAssignDialogOpen(false);
                                            setSelectedUserId(null);
                                            setSelectedChatbots([]);
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                        <Button 
                                          onClick={handleAssignChatbots}
                                          disabled={assignChatbotMutation.isPending || removeAssignmentMutation.isPending}
                                        >
                                          {(assignChatbotMutation.isPending || removeAssignmentMutation.isPending) && (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                          )}
                                          Update Access
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the user "{user.username}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteUserMutation.mutate(user.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="admin" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create Admin User Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Create Admin User
                  </CardTitle>
                  <CardDescription>
                    Add a new Admin user with full system access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter username" className="bg-[#f4f4f4]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter password" className="bg-[#f4f4f4]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        Create Admin User
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Admin Users List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Admin Users</CardTitle>
                  <CardDescription>
                    Manage Admin users with full system access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center p-6">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : !currentUsers.length ? (
                    <div className="text-center py-6 text-neutral-500">
                      No Admin users found. Create one to get started.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentUsers.map((user: User) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8 bg-primary text-white">
                                  <AvatarFallback className="bg-primary text-white text-sm">
                                    {getInitials(user.username)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-black">{user.username}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Admin User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete the admin user "{user.username}"? This action cannot be undone and will remove all administrative privileges.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteUserMutation.mutate(user.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}