import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMessages, sendMessage } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { toast } from "sonner";
import type { Message } from "@/types";

export const Messages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadMessages();
    }
  }, [user]);

  const loadMessages = async () => {
    if (!user) return;
    try {
      const data = await getMessages(user.uid);
      setMessages(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSend = async () => {
    if (!user || !selectedChat || !newMessage.trim()) return;

    try {
      await sendMessage({
        senderId: user.uid,
        receiverId: selectedChat,
        content: newMessage,
        read: false,
      });
      setNewMessage("");
      loadMessages();
      toast.success("Message sent");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-4 h-[600px]">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground p-4">No messages</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-4 border-b cursor-pointer hover:bg-accent"
                  onClick={() => setSelectedChat(msg.senderId)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">User</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{msg.content}</p>
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
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedChat ? (
            <div className="space-y-4">
              <ScrollArea className="h-[400px] pr-4">
                {messages
                  .filter(m => m.senderId === selectedChat || m.receiverId === selectedChat)
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className={`mb-4 flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] rounded-lg p-3 ${
                        msg.senderId === user?.uid 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </ScrollArea>

              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button onClick={handleSend}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Select a conversation to start chatting
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
