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
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/dashboard')}
          className="mb-3 sm:mb-4 md:mb-6 h-9 sm:h-auto text-xs sm:text-sm px-2 sm:px-4 touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5 sm:mr-2" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </Button>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">User Management</h1>

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
            {/* Mobile Card View */}
            <div className="block md:hidden divide-y">
              {users.map((userItem) => {
                const allRoles = userItem.roles && Array.isArray(userItem.roles) && userItem.roles.length > 0
                  ? userItem.roles
                  : userItem.role
                    ? [userItem.role]
                    : [];
                const uniqueRoles = Array.from(new Set(allRoles)).sort((a, b) => {
                  const order = { admin: 0, host: 1, guest: 2 };
                  return (order[a as keyof typeof order] ?? 99) - (order[b as keyof typeof order] ?? 99);
                });
                
                return (
                  <div key={userItem.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{userItem.fullName || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground truncate">{userItem.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenMessageDialog(userItem)}
                        className="h-8 text-xs touch-manipulation"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Message
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {uniqueRoles.map((role) => (
                        <Badge
                          key={role}
                          variant={
                            role === 'admin' 
                              ? 'default' 
                              : role === 'host'
                              ? 'secondary'
                              : 'outline'
                          }
                          className={
                            role === 'admin'
                              ? 'bg-orange-500 hover:bg-orange-600 text-xs'
                              : role === 'host'
                              ? 'bg-blue-500 hover:bg-blue-600 text-xs'
                              : 'bg-cyan-500 hover:bg-cyan-600 text-xs'
                          }
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Points</p>
                        <p className="font-medium">{userItem.points || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Wallet</p>
                        <p className="font-medium">{formatPHP(userItem.walletBalance || 0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Joined</p>
                        <p className="font-medium">
                          {userItem.createdAt 
                            ? new Date(userItem.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            // Get all roles - check roles array first, fallback to role field
                            const allRoles = userItem.roles && Array.isArray(userItem.roles) && userItem.roles.length > 0
                              ? userItem.roles
                              : userItem.role
                                ? [userItem.role]
                                : [];
                            
                            // Remove duplicates and sort (admin first, then host, then guest)
                            const uniqueRoles = Array.from(new Set(allRoles)).sort((a, b) => {
                              const order = { admin: 0, host: 1, guest: 2 };
                              return (order[a as keyof typeof order] ?? 99) - (order[b as keyof typeof order] ?? 99);
                            });
                            
                            return uniqueRoles.map((role) => (
                              <Badge
                                key={role}
                                variant={
                                  role === 'admin' 
                                    ? 'default' 
                                    : role === 'host'
                                    ? 'secondary'
                                    : 'outline'
                                }
                                className={
                                  role === 'admin'
                                    ? 'bg-orange-500 hover:bg-orange-600'
                                    : role === 'host'
                                    ? 'bg-blue-500 hover:bg-blue-600'
                                    : 'bg-cyan-500 hover:bg-cyan-600'
                                }
                              >
                                {role}
                              </Badge>
                            ));
                          })()}
                        </div>
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
                          className="gap-2 touch-manipulation"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Message Dialog */}
        <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                Send Message
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Send a message to {selectedUser?.fullName || selectedUser?.email || 'this user'}
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Recipient:</p>
                  <p className="font-semibold">{selectedUser.fullName || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(() => {
                      // Get all roles - check roles array first, fallback to role field
                      const allRoles = selectedUser.roles && Array.isArray(selectedUser.roles) && selectedUser.roles.length > 0
                        ? selectedUser.roles
                        : selectedUser.role
                          ? [selectedUser.role]
                          : [];
                      
                      // Remove duplicates and sort
                      const uniqueRoles = Array.from(new Set(allRoles)).sort((a, b) => {
                        const order = { admin: 0, host: 1, guest: 2 };
                        return (order[a as keyof typeof order] ?? 99) - (order[b as keyof typeof order] ?? 99);
                      });
                      
                      return uniqueRoles.map((role) => (
                        <Badge
                          key={role}
                          variant={
                            role === 'admin' 
                              ? 'default' 
                              : role === 'host'
                              ? 'secondary'
                              : 'outline'
                          }
                          className={
                            role === 'admin'
                              ? 'bg-orange-500 hover:bg-orange-600'
                              : role === 'host'
                              ? 'bg-blue-500 hover:bg-blue-600'
                              : 'bg-cyan-500 hover:bg-cyan-600'
                          }
                        >
                          {role}
                        </Badge>
                      ));
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message-content" className="text-sm sm:text-base font-semibold">
                    Message <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="message-content"
                    placeholder="Type your message here..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    className="min-h-[120px] sm:min-h-[150px] text-base sm:text-sm"
                    required
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    This message will be sent through the messaging system and the user will receive a notification.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setMessageDialogOpen(false);
                  setMessageContent('');
                  setSelectedUser(null);
                }}
                disabled={sending}
                className="w-full sm:w-auto h-11 sm:h-auto text-sm sm:text-base touch-manipulation"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={sending || !messageContent.trim()}
                className="gap-2 w-full sm:w-auto h-11 sm:h-auto text-sm sm:text-base touch-manipulation"
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
