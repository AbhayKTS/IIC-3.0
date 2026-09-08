import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { ChatMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  Hash,
  Users,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

const CHANNELS = [
  { id: 'chan-iic3', name: 'iic-3.0-hackathon', desc: 'Manipal University Jaipur Innovation Challenge discussion' },
  { id: 'chan-web3', name: 'polygon-web3-guild', desc: 'Smart contracts, SBTs, and bounty collaboration' },
  { id: 'chan-ai', name: 'ai-agents-models', desc: 'Azure OpenAI, embeddings, and prompt engineering' },
  { id: 'chan-placements', name: 'placement-prep', desc: 'Interview experiences, coding questions, and company drives' },
];

const SEED_MESSAGES: Record<string, ChatMessage[]> = {
  'chan-iic3': [
    {
      id: 'm1',
      communityId: 'chan-iic3',
      senderId: 's_priya',
      senderName: 'Priya Narang',
      text: 'Anyone teaming up for the AlmaDox Web3 track at Manipal University Jaipur? Looking for a Solidity dev!',
      timestamp: 'Today at 6:42 PM',
    },
    {
      id: 'm2',
      communityId: 'chan-iic3',
      senderId: 's_ansh',
      senderName: 'Ansh Sharma',
      text: 'Hey Priya! We have 2 slots in our team Deathly Hallows working on the Soulbound Token and Skill Graph engine.',
      timestamp: 'Today at 6:45 PM',
    },
    {
      id: 'm3',
      communityId: 'chan-iic3',
      senderId: 's_priya',
      senderName: 'Priya Narang',
      text: 'Awesome, just sent a request via the Events tab! Let’s crush this challenge.',
      timestamp: 'Today at 6:48 PM',
    },
  ],
};

export default function StudentChat() {
  const { session } = useAuth();
  const currentUserId = session?.userId || 'student';
  const currentUserName = session?.user?.name || (session?.user as any)?.email?.split('@')[0] || 'Student';

  const [activeChannel, setActiveChannel] = useState(CHANNELS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES['chan-iic3'] || []);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChannelMessages();
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChannelMessages = async () => {
    try {
      const data = await api.getMessages(activeChannel).catch(() => null);
      if (data && Array.isArray(data) && data.length > 0) {
        setMessages(data);
      } else {
        setMessages(SEED_MESSAGES[activeChannel] || [
          {
            id: `seed_${activeChannel}`,
            communityId: activeChannel,
            senderId: 'sys',
            senderName: 'AlmaDox Bot',
            text: `Welcome to #${CHANNELS.find((c) => c.id === activeChannel)?.name}! Chat with verified peers in real-time.`,
            timestamp: 'Just now',
          },
        ]);
      }
    } catch {
      setMessages(SEED_MESSAGES[activeChannel] || []);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      communityId: activeChannel,
      senderId: currentUserId,
      senderName: currentUserName,
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    try {
      await api.sendMessage({
        communityId: activeChannel,
        senderId: currentUserId,
        senderName: currentUserName,
        text: newMsg.text,
      }).catch(() => null);
    } catch {
      // Ignored for UX smoothness
    }
  };

  const currentChanObj = CHANNELS.find((c) => c.id === activeChannel);

  return (
    <DashboardLayout role="student">
      <div className="h-[calc(100vh-8rem)] flex rounded-2xl border border-border/80 overflow-hidden glass-card">
        {/* Channel Sidebar */}
        <div className="w-64 border-r border-border/60 bg-secondary/20 flex flex-col justify-between hidden md:flex">
          <div className="p-4 border-b border-border/60">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" /> Campus Channels
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Verified Student Chat</p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {CHANNELS.map((chan) => (
              <button
                key={chan.id}
                onClick={() => setActiveChannel(chan.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                  activeChannel === chan.id
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                }`}
              >
                <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{chan.name}</span>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-border/60 bg-secondary/30 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>End-to-end verified students</span>
          </div>
        </div>

        {/* Chat Main Area */}
        <div className="flex-1 flex flex-col bg-background/50">
          {/* Header */}
          <div className="p-4 border-b border-border/60 flex items-center justify-between bg-card/60">
            <div>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-sm text-foreground">{currentChanObj?.name}</h4>
              </div>
              <p className="text-xs text-muted-foreground">{currentChanObj?.desc}</p>
            </div>

            <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary hidden sm:flex">
              <Sparkles className="h-3 w-3" /> Live Campus Network
            </Badge>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground">
                      {isMe ? 'You' : msg.senderName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-none shadow-sm'
                        : 'bg-secondary/60 text-foreground border border-border/40 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-border/60 flex items-center gap-2 bg-card/40">
            <Input
              placeholder={`Message #${currentChanObj?.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="h-9 text-xs"
            />
            <Button type="submit" size="sm" className="h-9 px-4 gap-1.5">
              <Send className="h-3.5 w-3.5" /> Send
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
