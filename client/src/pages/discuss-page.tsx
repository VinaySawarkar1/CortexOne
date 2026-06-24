import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Hash, Plus, Search, Send, Loader2, Users, Bell, Phone, Video,
  Pin, Bookmark, Search as SearchIcon, MoreHorizontal, Smile,
  Paperclip, MessageSquare, Star, ChevronDown, ChevronRight,
  Settings, Trash2, UserPlus, Lock, Globe, Megaphone,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────
function timeAgo(d: string | Date) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Avatar({ name, size = 8, online }: { name: string; size?: number; online?: boolean }) {
  const initials = (name || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const colors = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899"];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div className="relative flex-shrink-0">
      <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white text-xs font-bold`}
        style={{ background: color, width: size * 4, height: size * 4, fontSize: size * 1.6 }}>
        {initials}
      </div>
      {online !== undefined && (
        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? "bg-green-500" : "bg-slate-300"}`} />
      )}
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, onDelete }: { msg: any; isOwn: boolean; onDelete?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div className={`flex items-start gap-3 group mb-1 ${isOwn ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Avatar name={msg.senderName || "?"} size={8} />
      <div className={`max-w-[65%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
          <span className="text-[11px] font-bold text-slate-700">{msg.senderName}</span>
          <span className="text-[10px] text-slate-400">{timeAgo(msg.createdAt)}</span>
        </div>
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed relative ${
          isOwn
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : "bg-white text-slate-800 rounded-tl-sm border border-slate-200 shadow-sm"
        }`}>
          {msg.body}
          {hover && isOwn && onDelete && (
            <button onClick={onDelete} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white opacity-80 hover:opacity-100">
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function DiscussPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: "", description: "", type: "public" });
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [starredOpen, setStarredOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Seed default channels on first load
  useEffect(() => {
    fetch("/api/channels/seed-defaults", { method: "POST", credentials: "include" });
  }, []);

  const { data: channels = [], isLoading: loadingChannels } = useQuery<any[]>({
    queryKey: ["/api/channels"],
    refetchInterval: 5000,
  });

  const selectedChannel = channels.find((c: any) => (c.id || c._id?.toString()) === selectedChannelId);

  const { data: messages = [], isLoading: loadingMsgs } = useQuery<any[]>({
    queryKey: ["/api/channels", selectedChannelId, "messages"],
    queryFn: async () => {
      if (!selectedChannelId) return [];
      const res = await fetch(`/api/channels/${selectedChannelId}/messages`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedChannelId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Select first channel by default
  useEffect(() => {
    if (!selectedChannelId && channels.length > 0) {
      const general = channels.find((c: any) => c.name === "general") || channels[0];
      setSelectedChannelId(general.id || general._id?.toString());
    }
  }, [channels, selectedChannelId]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!message.trim() || !selectedChannelId) return;
      return (await apiRequest("POST", `/api/channels/${selectedChannelId}/messages`, { body: message.trim() })).json();
    },
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["/api/channels", selectedChannelId, "messages"] });
      inputRef.current?.focus();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMessage = useMutation({
    mutationFn: async (msgId: string) => {
      return apiRequest("DELETE", `/api/channels/${selectedChannelId}/messages/${msgId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/channels", selectedChannelId, "messages"] }),
  });

  const createChannel = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/channels", newChannel)).json(),
    onSuccess: (ch) => {
      qc.invalidateQueries({ queryKey: ["/api/channels"] });
      setCreateOpen(false);
      setNewChannel({ name: "", description: "", type: "public" });
      setSelectedChannelId(ch.id || ch._id?.toString());
      toast({ title: `#${ch.name} channel created` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteChannel = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/channels/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/channels"] });
      setSelectedChannelId(null);
      toast({ title: "Channel deleted" });
    },
  });

  const joinChannel = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/channels/${id}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/channels"] }),
  });

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage.mutate(); }
  };

  const filteredChannels = channels.filter((c: any) => !search || c.name.toLowerCase().includes(search.toLowerCase()));
  const publicChannels = filteredChannels.filter((c: any) => c.type !== "direct");

  // Get unique participants for DM section (excluding current user)
  const uniqueParticipants = (user ? [{ name: user.name || user.username, id: user.id, online: true }] : []);

  return (
    <Layout>
      <div className="flex h-full" style={{ height: "calc(100vh - 56px)" }}>
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…"
                className="pl-8 h-7 text-xs bg-slate-50 border-slate-200" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {/* Starred Messages */}
            <div className="px-2 mb-1">
              <button onClick={() => setStarredOpen(s => !s)} className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2"><Star className="h-3.5 w-3.5" />Starred messages</div>
                {starredOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            </div>

            {/* Channels */}
            <div className="px-2 mb-1">
              <button onClick={() => setChannelsOpen(s => !s)} className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg">
                <span className="uppercase tracking-wide text-[10px]">Channels</span>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); setCreateOpen(true); }}
                    className="p-0.5 hover:bg-slate-200 rounded transition-colors" title="Add channel">
                    <Plus className="h-3 w-3 text-slate-500" />
                  </button>
                  {channelsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
              </button>
              {channelsOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {loadingChannels ? (
                    <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-indigo-400" /></div>
                  ) : publicChannels.map((ch: any) => {
                    const chId = ch.id || ch._id?.toString();
                    const active = chId === selectedChannelId;
                    const icon = ch.type === "private" ? <Lock className="h-3.5 w-3.5 flex-shrink-0" /> :
                                 ch.name === "announcements" ? <Megaphone className="h-3.5 w-3.5 flex-shrink-0" /> :
                                 <Hash className="h-3.5 w-3.5 flex-shrink-0" />;
                    return (
                      <button key={chId} onClick={() => setSelectedChannelId(chId)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all group ${
                          active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                        }`}>
                        <span className={active ? "text-indigo-500" : "text-slate-400"}>{icon}</span>
                        <span className="flex-1 text-left truncate">{ch.name}</span>
                      </button>
                    );
                  })}
                  {publicChannels.length === 0 && !loadingChannels && (
                    <p className="text-[11px] text-slate-400 px-2 py-1">No channels yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Direct Messages */}
            <div className="px-2">
              <button onClick={() => setDmsOpen(s => !s)} className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg">
                <span className="uppercase tracking-wide text-[10px]">Direct messages</span>
                <div className="flex items-center gap-1">
                  <Plus className="h-3 w-3 text-slate-400" />
                  {dmsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
              </button>
              {dmsOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {/* OdooBot style */}
                  {[{ name: "OdooBot", bot: true }].map(dm => (
                    <button key={dm.name} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">OB</div>
                      <span className="flex-1 text-left truncate">OdooBot</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main area ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedChannel ? (
            <>
              {/* Channel header */}
              <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center gap-2 flex-1">
                  <Hash className="h-5 w-5 text-slate-400" />
                  <span className="font-bold text-slate-800">{selectedChannel.name}</span>
                  {selectedChannel.description && (
                    <span className="text-xs text-slate-400 border-l border-slate-200 pl-3">{selectedChannel.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {[
                    { icon: Video, title: "Video call" },
                    { icon: Phone, title: "Voice call" },
                    { icon: Bell, title: "Notifications" },
                    { icon: UserPlus, title: "Invite" },
                    { icon: SearchIcon, title: "Search in channel" },
                    { icon: MessageSquare, title: "Threads" },
                    { icon: Paperclip, title: "Attachments" },
                    { icon: Pin, title: "Pinned messages" },
                    { icon: Users, title: "Members" },
                  ].map(({ icon: Icon, title }) => (
                    <button key={title} title={title} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                  <button title="Delete channel" onClick={() => { if (confirm(`Delete #${selectedChannel.name}?`)) deleteChannel.mutate(selectedChannel.id || selectedChannel._id?.toString()); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors ml-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
                {loadingMsgs ? (
                  <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-400" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                      <Hash className="h-8 w-8 text-indigo-400" />
                    </div>
                    <p className="font-bold text-slate-700 text-lg">Welcome to #{selectedChannel.name}!</p>
                    <p className="text-sm text-slate-400 mt-1">This is the start of the #{selectedChannel.name} channel</p>
                  </div>
                ) : (
                  <>
                    {/* Welcome banner at top */}
                    <div className="text-center py-6 mb-4">
                      <div className="inline-flex flex-col items-center">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                          <Hash className="h-7 w-7 text-indigo-400" />
                        </div>
                        <p className="font-extrabold text-slate-700 text-xl">Welcome to #{selectedChannel.name}!</p>
                        <p className="text-xs text-slate-400 mt-1">{selectedChannel.description}</p>
                      </div>
                    </div>

                    {/* Group messages by date */}
                    {messages.reduce((acc: any[], msg: any, i: number) => {
                      const msgDate = new Date(msg.createdAt).toDateString();
                      const prevDate = i > 0 ? new Date(messages[i-1].createdAt).toDateString() : null;
                      if (msgDate !== prevDate) {
                        acc.push({ type: "date", date: msg.createdAt, key: `date-${i}` });
                      }
                      acc.push({ type: "msg", msg, key: msg.id || msg._id?.toString() || i });
                      return acc;
                    }, []).map((item: any) => {
                      if (item.type === "date") return (
                        <div key={item.key} className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-slate-100" />
                          <span className="text-[11px] font-semibold text-slate-400 bg-white px-2">
                            {new Date(item.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                          </span>
                          <div className="flex-1 h-px bg-slate-100" />
                        </div>
                      );
                      const msg = item.msg;
                      const isOwn = msg.senderId === user?.id;
                      return (
                        <MessageBubble key={item.key} msg={msg} isOwn={isOwn}
                          onDelete={isOwn ? () => deleteMessage.mutate(msg.id || msg._id?.toString()) : undefined} />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message input */}
              <div className="px-5 pb-4 flex-shrink-0">
                <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm focus-within:border-indigo-300 transition-colors">
                  <Textarea
                    ref={inputRef}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={`Message #${selectedChannel.name}…`}
                    rows={1}
                    className="flex-1 resize-none border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0 py-0 min-h-[24px] max-h-32"
                    style={{ outline: "none", boxShadow: "none" }}
                  />
                  <div className="flex items-center gap-1 flex-shrink-0 pb-0.5">
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <Smile className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => sendMessage.mutate()}
                      disabled={!message.trim() || sendMessage.isPending}
                      className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white flex items-center justify-center transition-colors ml-1"
                    >
                      {sendMessage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-center">Press Enter to send · Shift+Enter for new line</p>
              </div>
            </>
          ) : (
            /* No channel selected */
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-5">
                <MessageSquare className="h-10 w-10 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-700 mb-2">Open a conversation</h2>
              <p className="text-sm text-slate-400 mb-6">Pick a channel or start a direct message</p>
              <Button onClick={() => setCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="h-4 w-4" />Create Channel
              </Button>
            </div>
          )}
        </div>

        {/* ── Members panel ──────────────────────────────────────── */}
        {selectedChannel && (
          <aside className="w-56 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Members</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold mb-2 hover:bg-indigo-100 transition-colors">
                <UserPlus className="h-3.5 w-3.5" />Invite a User
              </button>

              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">Online — 1</p>
                {/* Show current user as online */}
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-xs text-slate-700 font-semibold transition-colors">
                  <Avatar name={user?.name || user?.username || "Me"} size={7} online={true} />
                  <span className="flex-1 text-left truncate">{user?.name || user?.username}</span>
                </button>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">Offline — 2</p>
                {[{ name: "Administrator" }, { name: "Tushar" }].map(m => (
                  <button key={m.name} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-xs text-slate-500 font-semibold transition-colors">
                    <Avatar name={m.name} size={7} online={false} />
                    <span className="flex-1 text-left truncate">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Create Channel Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create a Channel</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Channel Name *</Label>
              <div className="relative">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input value={newChannel.name} onChange={e => setNewChannel(n => ({ ...n, name: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))}
                  placeholder="e.g. project-updates" className="pl-8 h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Input value={newChannel.description} onChange={e => setNewChannel(n => ({ ...n, description: e.target.value }))}
                placeholder="What's this channel about?" className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Channel Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "public", l: "Public", desc: "Visible to everyone", icon: Globe },
                  { v: "private", l: "Private", desc: "Invite only", icon: Lock },
                ].map(opt => (
                  <button key={opt.v} onClick={() => setNewChannel(n => ({ ...n, type: opt.v }))}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${newChannel.type === opt.v ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <opt.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${newChannel.type === opt.v ? "text-indigo-600" : "text-slate-400"}`} />
                    <div>
                      <div className={`text-xs font-bold ${newChannel.type === opt.v ? "text-indigo-700" : "text-slate-700"}`}>{opt.l}</div>
                      <div className="text-[10px] text-slate-400">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => createChannel.mutate()} disabled={!newChannel.name.trim() || createChannel.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              {createChannel.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Create Channel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
