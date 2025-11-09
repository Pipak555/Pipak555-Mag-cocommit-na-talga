import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToMessages, sendMessage, getUserProfile, markMessagesAsRead } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Send, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for userId query parameter and auto-select conversation
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId && userId !== selectedChat) {
      setSelectedChat(userId);
      // Load participant name immediately
      loadParticipantName(userId);
      // Remove the query parameter after selecting
      searchParams.delete('userId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, selectedChat, setSearchParams]);

  // Load participant name for a specific user
  const loadParticipantName = async (userId: string) => {
    if (participantNames[userId]) return; // Already loaded
    
    try {
      const profile = await getUserProfile(userId);
      if (profile) {
        setParticipantNames(prev => ({
          ...prev,
          [userId]: profile.fullName || profile.email || "Unknown User"
        }));
      }
    } catch (error) {
      console.error('Error loading participant name:', error);
    }
  };

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
    ? participantNames[selectedChat] || "Loading..."
    : null;

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedChat && user) {
      // Mark all unread messages in this conversation as read
      markMessagesAsRead(user.uid, selectedChat).catch(error => {
        console.error('Error marking messages as read:', error);
      });
    }
  }, [selectedChat, user]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationMessages]);

  // Extract images from message content
  const extractImages = useCallback((messages: Message[]): string[] => {
    const images: string[] = [];
    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|svg))/gi;
    
    messages.forEach(msg => {
      const matches = msg.content.match(urlRegex);
      if (matches) {
        images.push(...matches);
      }
    });
    
    return images;
  }, []);

  // Handle image click to open lightbox
  const handleImageClick = (imageUrl: string, allImages: string[]) => {
    const index = allImages.indexOf(imageUrl);
    setLightboxImages(allImages);
    setLightboxImageIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
  };

  const handleSend = useCallback(async () => {
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
  }, [user, selectedChat, newMessage]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-120px)] sm:h-[600px]">
      <Card className={`${selectedChat ? 'hidden md:block md:col-span-1' : 'col-span-1'}`}>
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Conversations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-200px)] sm:h-[500px]">
            {conversations.length === 0 ? (
              <p className="text-center text-muted-foreground p-4">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.participantId}
                  className={`p-3 sm:p-4 border-b cursor-pointer hover:bg-accent active:bg-accent transition-colors touch-manipulation ${
                    selectedChat === conv.participantId ? 'bg-accent' : ''
                  }`}
                  onClick={() => {
                    setSelectedChat(conv.participantId);
                    // Load name if not already loaded
                    if (!participantNames[conv.participantId]) {
                      loadParticipantName(conv.participantId);
                    }
                  }}
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

      <Card className={`${selectedChat ? 'col-span-1 md:col-span-2' : 'hidden md:block md:col-span-2'}`}>
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 touch-manipulation"
              onClick={() => setSelectedChat(null)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base sm:text-lg truncate">
              {selectedParticipantName ? `Chat with ${selectedParticipantName}` : "Chat"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {selectedChat ? (
            <div className="space-y-4 flex flex-col h-[calc(100vh-240px)] sm:h-[500px]">
              <ScrollArea className="flex-1 pr-2 sm:pr-4">
                {conversationMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversationMessages.map((msg) => {
                      // Extract image URLs from message content
                      const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|svg))/gi;
                      const imageMatches = msg.content.match(urlRegex);
                      const textContent = msg.content.replace(urlRegex, '').trim();
                      const allImages = extractImages(conversationMessages);
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-2.5 sm:p-3 ${
                            msg.senderId === user?.uid 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}>
                            {/* Text content */}
                            {textContent && (
                              <p className="text-sm whitespace-pre-wrap break-words">{textContent}</p>
                            )}
                            
                            {/* Images */}
                            {imageMatches && imageMatches.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {imageMatches.map((imageUrl, idx) => (
                                  <div key={idx} className="relative group">
                                    <img
                                      src={imageUrl}
                                      alt={`Image ${idx + 1}`}
                                      className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover"
                                      onClick={() => handleImageClick(imageUrl, allImages)}
                                    />
                                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                      <ZoomIn className="h-3 w-3 inline mr-1" />
                                      Click to zoom
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
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
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="flex gap-2 pt-2 sm:pt-3 border-t">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="h-11 sm:h-auto text-base sm:text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button 
                  onClick={handleSend} 
                  disabled={!newMessage.trim()}
                  className="flex items-center gap-2 h-11 sm:h-auto px-4 sm:px-6 touch-manipulation"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send</span>
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

      {/* Lightbox/Modal for Full-Size Image Viewing */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-auto h-auto p-0 bg-black/95 border-none m-1">
          <DialogTitle className="sr-only">View Full Size Image</DialogTitle>
          <DialogDescription className="sr-only">
            Viewing image {lightboxImageIndex + 1} of {lightboxImages.length}
          </DialogDescription>
          <div className="relative w-full h-full flex items-center justify-center min-h-[400px]">
            {lightboxImages.length > 0 && (
              <>
                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-50 bg-black/70 hover:bg-black/90 text-white border-none h-8 w-8 sm:h-10 sm:w-10"
                  onClick={() => setLightboxOpen(false)}
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>

                {/* Image Counter */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm z-50">
                  {lightboxImageIndex + 1} / {lightboxImages.length}
                </div>

                {/* Main Image */}
                <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 pt-12 pb-20 sm:pb-24">
                  <img 
                    src={lightboxImages[lightboxImageIndex] || '/placeholder.svg'} 
                    alt={`Image ${lightboxImageIndex + 1}`}
                    className="max-w-full max-h-[calc(98vh-160px)] object-contain"
                  />
                </div>

                {/* Navigation Buttons */}
                {lightboxImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50 bg-black/70 hover:bg-black/90 text-white border-none h-8 w-8 sm:h-12 sm:w-12"
                      onClick={() => setLightboxImageIndex((prev) => 
                        prev === 0 ? lightboxImages.length - 1 : prev - 1
                      )}
                    >
                      <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-50 bg-black/70 hover:bg-black/90 text-white border-none h-8 w-8 sm:h-12 sm:w-12"
                      onClick={() => setLightboxImageIndex((prev) => 
                        prev === lightboxImages.length - 1 ? 0 : prev + 1
                      )}
                    >
                      <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
                    </Button>
                  </>
                )}

                {/* Thumbnail Strip at Bottom for Navigation */}
                {lightboxImages.length > 1 && (
                  <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-lg p-2 sm:p-3 z-50 max-w-[calc(98vw-32px)]">
                    <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide px-1">
                      {lightboxImages.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setLightboxImageIndex(i)}
                          className={`relative flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded transition-all ${
                            lightboxImageIndex === i 
                              ? 'scale-110 shadow-lg shadow-primary/50' 
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className={`absolute inset-0 rounded overflow-hidden border-2 ${
                            lightboxImageIndex === i 
                              ? 'border-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-black/70' 
                              : 'border-transparent hover:border-white/50'
                          }`}>
                            <img 
                              src={img} 
                              alt={`Thumbnail ${i + 1}`}
                              className={`w-full h-full object-cover transition-opacity ${
                                lightboxImageIndex === i ? 'opacity-100' : 'opacity-70'
                              }`}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
