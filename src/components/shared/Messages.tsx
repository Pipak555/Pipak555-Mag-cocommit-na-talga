import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToMessages, sendMessage, getUserProfile } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { toast } from "sonner";
import type { Message } from "@/types";
import LoadingScreen from "@/components/ui/loading-screen";

interface Conversation {
  participantId: string;
  participantName: string;
  lastMessage: Message;
  unreadCount: number;
}

export const Messages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Group messages by conversation partner
  const conversations = useMemo(() => {
    if (!user || messages.length === 0) return [];

    const conversationMap = new Map<string, Conversation>();

    messages.forEach((msg) => {
      // Determine the other participant in this conversation
      const otherParticipantId = msg.senderId === user.uid 
        ? msg.receiverId 
        : msg.senderId;

      if (!conversationMap.has(otherParticipantId)) {
        conversationMap.set(otherParticipantId, {
          participantId: otherParticipantId,
          participantName: participantNames[otherParticipantId] || "Unknown User",
          lastMessage: msg,
          unreadCount: messages.filter(
            m => (m.senderId === otherParticipantId || m.receiverId === otherParticipantId) &&
                 m.receiverId === user.uid &&
                 !m.read
          ).length
        });
      } else {
        const existing = conversationMap.get(otherParticipantId)!;
        // Update if this message is more recent
        if (new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
          existing.lastMessage = msg;
        }
      }
    });

    // Sort conversations by last message time (most recent first)
    return Array.from(conversationMap.values()).sort((a, b) => 
      new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }, [messages, user, participantNames]);

  // Load participant names
  useEffect(() => {
    const loadParticipantNames = async () => {
      if (!user || conversations.length === 0) return;

      const namesToFetch: string[] = [];
      conversations.forEach((conv) => {
        if (!participantNames[conv.participantId]) {
          namesToFetch.push(conv.participantId);
        }
      });

      if (namesToFetch.length === 0) return;

      const names: Record<string, string> = {};
      
      await Promise.all(
        namesToFetch.map(async (participantId) => {
          const profile = await getUserProfile(participantId);
          if (profile) {
            names[participantId] = profile.fullName || profile.email || "Unknown User";
          }
        })
      );

      // Only update if we fetched new names
      if (Object.keys(names).length > 0) {
        setParticipantNames(prev => ({ ...prev, ...names }));
      }
    };

    loadParticipantNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, user]);

  // Set up real-time listener for messages
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToMessages(user.uid, (updatedMessages) => {
      setMessages(updatedMessages);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Get messages for selected conversation
  const conversationMessages = useMemo(() => {
    if (!selectedChat || !user) return [];
    
    return messages
      .filter(m => 
        (m.senderId === selectedChat && m.receiverId === user.uid) ||
        (m.senderId === user.uid && m.receiverId === selectedChat)
      )
      .sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }, [messages, selectedChat, user]);

  // Get selected conversation participant name
  const selectedParticipantName = selectedChat 
    ? participantNames[selectedChat] || "Unknown User"
    : null;

  const handleSend = async () => {
    if (!user || !selectedChat || !newMessage.trim()) return;

    try {
      await sendMessage({
        senderId: user.uid,
        receiverId: selectedChat,
        content: newMessage.trim(),
        read: false,
      });
      setNewMessage("");
      toast.success("Message sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="grid md:grid-cols-3 gap-4 h-[600px]">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {conversations.length === 0 ? (
              <p className="text-center text-muted-foreground p-4">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.participantId}
                  className={`p-4 border-b cursor-pointer hover:bg-accent transition-colors ${
                    selectedChat === conv.participantId ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedChat(conv.participantId)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {conv.participantName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">{conv.participantName}</p>
                        {conv.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {conv.lastMessage.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(conv.lastMessage.createdAt).toLocaleDateString() === new Date().toLocaleDateString()
                          ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>
            {selectedParticipantName ? `Chat with ${selectedParticipantName}` : "Chat"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedChat ? (
            <div className="space-y-4 flex flex-col h-[500px]">
              <ScrollArea className="flex-1 pr-4">
                {conversationMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversationMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] rounded-lg p-3 ${
                          msg.senderId === user?.uid 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-xs mt-1 ${
                            msg.senderId === user?.uid 
                              ? 'opacity-70' 
                              : 'text-muted-foreground'
                          }`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex gap-2 pt-2 border-t">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button onClick={handleSend} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-[500px] flex items-center justify-center text-muted-foreground">
              Select a conversation to start chatting
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
