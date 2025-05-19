import { useState } from "react";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, UserPlus, X, Check } from "lucide-react";
import { getInitials } from "@/lib/utils";

const createUserSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters",
  }),
  role: z.literal("careteam"),
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
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedChatbots, setSelectedChatbots] = useState<number[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "careteam"
    },
  });

  // Fetch all care team users
  const { data: careTeamUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/admin/care-team/users"],
    retry: false,
  });

  // Fetch all chatbots for assignment
  const { data: chatbots = [], isLoading: isLoadingChatbots } = useQuery({
    queryKey: ["/api/chatbots"],
    retry: false,
  });

  // Fetch assignments for selected user
  const { data: userAssignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ["/api/care-team/assignments", selectedUserId],
    enabled: !!selectedUserId,
    retry: false,
  });

  // Create care team user
  const createUserMutation = useMutation({
    mutationFn: (values: CreateUserValues) => 
      fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => Promise.reject(err));
        }
        return res.json();
      }),
    onSuccess: () => {
      toast({
        title: "User created",
        description: "Care team user has been created successfully",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/care-team/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Assign chatbot to user
  const assignChatbotMutation = useMutation({
    mutationFn: ({ userId, chatbotId }: { userId: number; chatbotId: number }) => 
      fetch("/api/admin/care-team/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, chatbotId }),
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => Promise.reject(err));
        }
        return res.json();
      }),
    onSuccess: () => {
      toast({
        title: "Chatbot assigned",
        description: "Chatbot has been assigned to the care team user",
      });
      refetchAssignments();
      setIsAssignDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign chatbot",
        variant: "destructive",
      });
    },
  });

  // Remove chatbot assignment
  const removeAssignmentMutation = useMutation({
    mutationFn: ({ userId, chatbotId }: { userId: number; chatbotId: number }) => 
      fetch(`/api/admin/care-team/assignments/${userId}/${chatbotId}`, {
        method: "DELETE"
      }).then(res => {
        if (!res.ok && res.status !== 204) {
          return res.json().then(err => Promise.reject(err));
        }
        return true;
      }),
    onSuccess: () => {
      toast({
        title: "Assignment removed",
        description: "Chatbot assignment has been removed",
      });
      refetchAssignments();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove assignment",
        variant: "destructive",
      });
    },
  });

  // Handle user creation form submission
  const onSubmit = (values: CreateUserValues) => {
    createUserMutation.mutate(values);
  };

  // Handle selecting a user to manage
  const handleSelectUser = (userId: number) => {
    setSelectedUserId(userId);
    setSelectedChatbots([]);
  };

  // Handle chatbot assignment
  const handleAssignChatbots = () => {
    if (!selectedUserId || selectedChatbots.length === 0) return;

    // Process each chatbot assignment
    selectedChatbots.forEach((chatbotId) => {
      assignChatbotMutation.mutate({ userId: selectedUserId, chatbotId });
    });
  };

  // Get assigned chatbot IDs
  const getAssignedChatbotIds = () => {
    return userAssignments.map((chatbot: any) => chatbot.id);
  };

  // Check if a chatbot is already assigned
  const isChatbotAssigned = (chatbotId: number) => {
    return getAssignedChatbotIds().includes(chatbotId);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black mb-1">Care Team Management</h1>
            <p className="text-neutral-500">
              Create and manage Care Team users and their access to patient care aids
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create user card */}
          <Card>
            <CardHeader>
              <CardTitle>Create Care Team User</CardTitle>
              <CardDescription>
                Create new users with Care Team access permissions
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
                          <Input placeholder="Username" {...field} />
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
                          <Input type="password" placeholder="Password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Select
                            disabled
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="careteam">Care Team</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Care Team users can only view assigned patient care aids
                        </FormDescription>
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
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" /> Create User
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* User list card */}
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
              ) : !careTeamUsers.length ? (
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
                    {careTeamUsers.map((user: User) => (
                      <TableRow key={user.id} className={user.id === selectedUserId ? "bg-primary/10" : ""}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8 bg-primary text-white">
                              <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.username}</div>
                              <div className="text-xs text-neutral-500">Care Team Member</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.id === selectedUserId ? (
                            <div className="flex flex-wrap gap-1">
                              {!userAssignments.length ? (
                                <span className="text-sm text-neutral-500">No assignments</span>
                              ) : (
                                userAssignments.map((chatbot: Chatbot) => (
                                  <Badge variant="outline" key={chatbot.id} className="flex items-center gap-1">
                                    {chatbot.name}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-4 w-4 text-neutral-500 hover:text-destructive"
                                      onClick={() => removeAssignmentMutation.mutate({ 
                                        userId: user.id, 
                                        chatbotId: chatbot.id 
                                      })}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </Badge>
                                ))
                              )}
                            </div>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleSelectUser(user.id)}
                            >
                              View assignments
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog open={isAssignDialogOpen && selectedUserId === user.id} onOpenChange={setIsAssignDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  handleSelectUser(user.id);
                                  setIsAssignDialogOpen(true);
                                }}
                              >
                                Assign Care Aids
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Assign Care Aids to {user.username}</DialogTitle>
                                <DialogDescription>
                                  Select care aids to assign to this Care Team member
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                {isLoadingChatbots ? (
                                  <div className="flex items-center justify-center p-6">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                  </div>
                                ) : !chatbots.length ? (
                                  <div className="text-center py-6 text-neutral-500">
                                    No care aids available for assignment
                                  </div>
                                ) : (
                                  <div className="space-y-1 max-h-60 overflow-auto">
                                    {chatbots.map((chatbot: Chatbot) => (
                                      <div 
                                        key={chatbot.id} 
                                        className={`flex items-center justify-between p-2 rounded-md ${
                                          isChatbotAssigned(chatbot.id) 
                                            ? "bg-green-100" 
                                            : selectedChatbots.includes(chatbot.id)
                                            ? "bg-primary/20"
                                            : "hover:bg-neutral-100"
                                        }`}
                                      >
                                        <span className="text-sm">{chatbot.name}</span>
                                        {isChatbotAssigned(chatbot.id) ? (
                                          <Badge variant="outline" className="bg-green-100">
                                            <Check className="h-3 w-3 mr-1" /> Assigned
                                          </Badge>
                                        ) : (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              if (selectedChatbots.includes(chatbot.id)) {
                                                setSelectedChatbots(
                                                  selectedChatbots.filter(id => id !== chatbot.id)
                                                );
                                              } else {
                                                setSelectedChatbots([...selectedChatbots, chatbot.id]);
                                              }
                                            }}
                                          >
                                            {selectedChatbots.includes(chatbot.id) ? "Deselect" : "Select"}
                                          </Button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <DialogFooter className="sm:justify-between">
                                <DialogClose asChild>
                                  <Button variant="secondary" type="button">
                                    Cancel
                                  </Button>
                                </DialogClose>
                                <Button
                                  type="button"
                                  disabled={selectedChatbots.length === 0 || assignChatbotMutation.isPending}
                                  onClick={handleAssignChatbots}
                                >
                                  {assignChatbotMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning...
                                    </>
                                  ) : (
                                    <>Assign Selected</>
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}