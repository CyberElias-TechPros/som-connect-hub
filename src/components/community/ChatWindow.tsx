import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle } from 'lucide-react';
import { currentUser } from '@/lib/mock-data';
import { useToast } from '@/components/ui/use-toast';

export interface ChatMessage {
  id: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  isCurrentUser?: boolean;
}

export interface ChatWindowProps {
  sessionId: string;
  initialMessages?: ChatMessage[];
  onSendMessage?: (message: string) => void;
}

export default function ChatWindow({ sessionId, initialMessages = [], onSendMessage }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) {
      toast({
        title: 'Empty Message',
        description: 'Please enter a message before sending.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
      content: newMessage,
      timestamp: new Date().toISOString(),
      isCurrentUser: true,
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Call external handler if provided
    if (onSendMessage) {
      onSendMessage(newMessage);
    }

    // Simulate reply after 1-3 seconds
    setTimeout(() => {
      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: {
          id: 'bot',
          name: 'Session Host',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        },
        content: `Thanks for your message! We'll address this during the session.`,
        timestamp: new Date().toISOString(),
        isCurrentUser: false,
      };
      setMessages(prev => [...prev, reply]);
      setIsSending(false);
      
      // Focus back on input after sending
      setTimeout(() => inputRef.current?.focus(), 100);
    }, 1000 + Math.random() * 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Live Chat
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>No messages yet. Be the first to say something!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!message.isCurrentUser && (
                    <Avatar className="w-8 h-8 mt-auto">
                      <AvatarImage src={message.sender.avatar} />
                      <AvatarFallback>{message.sender.name[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${message.isCurrentUser 
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted text-foreground rounded-bl-none'}`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {message.isCurrentUser && (
                    <Avatar className="w-8 h-8 mt-auto">
                      <AvatarImage src={message.sender.avatar} />
                      <AvatarFallback>{message.sender.name[0]}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              aria-label="Type your message"
              autoComplete="off"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              className="gap-2"
              aria-label="Send message"
            >
              {isSending ? (
                <span className="w-4 h-4 animate-spin">🌀</span>
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}