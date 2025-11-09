import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sendMessage } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, AlertCircle, Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import type { UserProfile } from "@/types";
import { formatPHP } from "@/lib/currency";

const ManageUsers = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [users, setUsers] = useState<Array<UserProfile & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(UserProfile & { id: string }) | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/admin/login');
      return;
    }
    loadUsers();
  }, [user, userRole, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserProfile & { id: string }));
      setUsers(data);
      
      if (data.length === 0) {
        setError('No users found in the database.');
      }
    } catch (error: any) {
      console.error("Failed to load users", error);
      const errorMessage = error.code === 'permission-denied'
        ? 'Permission denied. Please check that your admin role is set correctly in Firestore.'
        : error.message || 'Failed to load users. Please check the console for details.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMessageDialog = (targetUser: UserProfile & { id: string }) => {
    setSelectedUser(targetUser);
    setMessageContent('');
    setMessageDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!user || !selectedUser || !messageContent.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      await sendMessage({
        senderId: user.uid,
        receiverId: selectedUser.id,
        content: messageContent.trim(),
        read: false,
      });
      
      toast.success(`Message sent to ${selectedUser.fullName || selectedUser.email}`);
      setMessageDialogOpen(false);
      setMessageContent('');
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(`Failed to send message: ${error.message || 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">User Management</h1>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading users...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="text-destructive font-medium mb-2">{error}</p>
              <p className="text-sm text-muted-foreground mb-4">
                Make sure your admin user has the role field set to "admin" in Firestore.
              </p>
              <Button onClick={loadUsers} variant="outline">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No users found in the database.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Wallet Balance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userItem) => (
                  <TableRow key={userItem.id}>
                    <TableCell className="font-medium">{userItem.fullName || 'N/A'}</TableCell>
                    <TableCell>{userItem.email}</TableCell>
                    <TableCell>
                      <Badge variant={userItem.role === 'admin' ? 'default' : 'secondary'}>
                        {userItem.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{userItem.points || 0}</TableCell>
                    <TableCell>{formatPHP(userItem.walletBalance || 0)}</TableCell>
                    <TableCell>
                      {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenMessageDialog(userItem)}
                        className="gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Message Dialog */}
        <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Send Message
              </DialogTitle>
              <DialogDescription>
                Send a message to {selectedUser?.fullName || selectedUser?.email || 'this user'}
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Recipient:</p>
                  <p className="font-semibold">{selectedUser.fullName || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <Badge variant="secondary" className="mt-2">
                    {selectedUser.role}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message-content" className="text-base font-semibold">
                    Message <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="message-content"
                    placeholder="Type your message here..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    className="min-h-[150px]"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    This message will be sent through the messaging system and the user will receive a notification.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setMessageDialogOpen(false);
                  setMessageContent('');
                  setSelectedUser(null);
                }}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={sending || !messageContent.trim()}
                className="gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ManageUsers;
