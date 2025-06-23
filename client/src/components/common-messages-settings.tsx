import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CommonMessage, InsertCommonMessage } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

type Row = { 
  id?: number; 
  userId?: number; 
  kind: 'welcome' | 'faq'; 
  text: string;
  isNew?: boolean;
};

interface CommonMessagesSettingsProps {
  userId: number;
}

export default function CommonMessagesSettings({ userId }: CommonMessagesSettingsProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch common messages
  const { data: commonMessages, isLoading } = useQuery<CommonMessage[]>({
    queryKey: [`/api/common-messages/${userId}`],
    enabled: !!userId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (message: InsertCommonMessage) => 
      apiRequest('/api/common-messages', 'POST', message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/common-messages/${userId}`] });
      toast({ title: "Message saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save message", variant: "destructive" });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) => 
      apiRequest(`/api/common-messages/${id}`, 'PUT', { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/common-messages/${userId}`] });
      toast({ title: "Message updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update message", variant: "destructive" });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/common-messages/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/common-messages/${userId}`] });
      toast({ title: "Message deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete message", variant: "destructive" });
    }
  });

  useEffect(() => {
    if (commonMessages) {
      setRows(commonMessages.map(msg => ({
        id: msg.id,
        userId: msg.userId,
        kind: msg.kind,
        text: msg.text
      })));
    }
  }, [commonMessages]);

  const addBlank = () => {
    setRows([{ kind: 'welcome', text: '', isNew: true }, ...rows]);
  };

  const updateRow = (index: number, updates: Partial<Row>) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, ...updates } : row));
  };

  const saveRow = async (row: Row, index: number) => {
    if (!row.text.trim()) return;

    if (row.isNew || !row.id) {
      // Create new message
      await createMutation.mutateAsync({
        userId,
        kind: row.kind,
        text: row.text
      });
    } else {
      // Update existing message
      await updateMutation.mutateAsync({
        id: row.id,
        text: row.text
      });
    }
  };

  const deleteRow = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Common Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-neutral-500">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Common Messages
          <Button onClick={addBlank} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <div className="text-sm text-neutral-400 text-center py-8">
            No common messages yet. Click "Add New" to create your first template.
          </div>
        ) : (
          rows.map((row, index) => (
            <div key={row.id ?? `new-${index}`} className="flex gap-3 items-start p-4 border border-neutral-700 rounded-lg bg-neutral-800">
              <Select
                value={row.kind}
                onValueChange={(value: 'welcome' | 'faq') => updateRow(index, { kind: value })}
              >
                <SelectTrigger className="w-32 bg-neutral-900 border-neutral-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Welcome</SelectItem>
                  <SelectItem value="faq">FAQ</SelectItem>
                </SelectContent>
              </Select>
              
              <Textarea
                className="flex-1 bg-neutral-900 border-neutral-600 text-white placeholder:text-neutral-400"
                value={row.text}
                placeholder="Enter your message text..."
                rows={3}
                onChange={(e) => updateRow(index, { text: e.target.value })}
                onBlur={() => saveRow(row, index)}
              />
              
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveRow(row, index)}
                  disabled={!row.text.trim() || createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                </Button>
                
                {row.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteRow(row.id!)}
                    disabled={deleteMutation.isPending}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
        
        {(createMutation.isPending || updateMutation.isPending || deleteMutation.isPending) && (
          <div className="text-sm text-neutral-400">Saving...</div>
        )}
      </CardContent>
    </Card>
  );
}