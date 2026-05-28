"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  MessageSquare, Send, X, User, MessageCircle, 
  Users, ChevronLeft, ShieldAlert, Search, Eye,
  History, UserCircle, Bell, Volume2, VolumeX,
  LayoutDashboard, Inbox, Clock, ShieldCheck,
  ArrowRightLeft, SendHorizontal, Monitor
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type ChatType = "group" | "private";
type ViewMode = "list" | "chat" | "admin-dashboard";

export default function ChatDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [chatType, setChatType] = useState<ChatType>("group");
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [monitorPair, setMonitorPair] = useState<{ u1: any, u2: any } | null>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [activeConversations, setActiveConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // 🔔 Notifications
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState<{name: string, content: string, type: ChatType, senderId: string} | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [readConversations, setReadConversations] = useState<Record<string, string>>({});

  // 🟢 ONLINE STATUS ENGINE (NEW & STABLE)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, {name: string, timeout: any}>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const notificationSound = useRef<HTMLAudioElement | null>(null);
  const presenceChannelRef = useRef<any>(null);

  useEffect(() => {
    notificationSound.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
    const savedRead = localStorage.getItem("chat_read_status");
    if (savedRead) setReadConversations(JSON.parse(savedRead));
  }, []);

  const playSound = () => {
    if (soundEnabled && notificationSound.current) {
      notificationSound.current.currentTime = 0;
      notificationSound.current.play().catch(() => {});
    }
  };

  const getFriendlyName = (u: any) => {
    if (!u) return "System";
    const email = u.email || u.user_name || (typeof u === 'string' ? u : "");
    if (email && typeof email === 'string') return email.split('@')[0];
    return "User " + (u.id?.slice(0, 4) || "####");
  };

  const getRoomId = (type: ChatType, otherId?: string) => {
    if (type === "group") return "group_main";
    return [user?.id, otherId].sort().join("_");
  };

  const markAsRead = (roomId: string) => {
    const now = new Date().toISOString();
    setReadConversations(prev => {
      const updated = { ...prev, [roomId]: now };
      localStorage.setItem("chat_read_status", JSON.stringify(updated));
      return updated;
    });
  };

  // 1. Core Data
  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", authUser.id).single();
      setIsAdmin(profile?.role === "admin");

      let allUsers: any[] = [];
      try {
        const res = await fetch('/api/admin/list-users');
        if (res.ok) allUsers = await res.json();
      } catch (err) {}
      if (allUsers.length === 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, email, department, role");
        allUsers = profiles || [];
      }
      setUsersList(allUsers.filter(u => u.id !== authUser.id));
    };
    init();
  }, []);

  const loadThreads = async () => {
    const { data } = await supabase.from("internal_messages").select("*").order("created_at", { ascending: false });
    if (data) {
      const threads: any[] = [];
      const seen = new Set();
      data.forEach(m => {
        const roomId = m.type === "group" ? "group_main" : [m.user_id, m.recipient_id].sort().join("_");
        if (!seen.has(roomId)) {
          seen.add(roomId);
          const u1 = usersList.find(u => u.id === m.user_id) || { id: m.user_id, email: m.user_name };
          const u2 = usersList.find(u => u.id === m.recipient_id) || { id: m.recipient_id, email: "User" };
          threads.push({ ...m, u1, u2, roomId });
        }
      });
      setActiveConversations(threads);
    }
  };

  useEffect(() => { if (usersList.length > 0) loadThreads(); }, [usersList, view, isOpen]);

  // 2. 🚀 THE ULTIMATE PRESENCE ENGINE
  useEffect(() => {
    if (!user?.id) return;

    // Create a very stable channel purely for presence
    const onlineChannel = supabase.channel("chat-online-v5", {
      config: { presence: { key: user.id } }
    });

    presenceChannelRef.current = onlineChannel;

    onlineChannel
      .on("presence", { event: "sync" }, () => {
        const state = onlineChannel.presenceState();
        const activeIds = new Set(Object.keys(state));
        setOnlineUsers(activeIds);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        setOnlineUsers(prev => new Set([...Array.from(prev), key]));
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, userName, roomId } = payload.payload;
        // Optimization: If someone is typing, they ARE online
        setOnlineUsers(prev => new Set([...Array.from(prev), userId]));
        window.dispatchEvent(new CustomEvent('chat-typing-evt', { detail: { userId, userName, roomId } }));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "internal_messages" }, (payload) => {
        const nm = payload.new;
        // Optimization: If someone sent a message, they ARE online
        setOnlineUsers(prev => new Set([...Array.from(prev), nm.user_id]));
        window.dispatchEvent(new CustomEvent('chat-msg-evt', { detail: nm }));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await onlineChannel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(onlineChannel); };
  }, [user?.id]);

  // 3. Messages & Typing Logic
  useEffect(() => {
    if (!user) return;

    const handleMsg = (e: any) => {
      const nm = e.detail;
      const isNotMe = nm.user_id !== user.id;
      const isForMe = nm.recipient_id === user.id || nm.type === "group";
      const roomId = nm.type === "group" ? "group_main" : [nm.user_id, nm.recipient_id].sort().join("_");

      if (isNotMe && isForMe) {
        const isViewing = isOpen && view === "chat" && chatType === nm.type && (chatType === "group" || selectedRecipient?.id === nm.user_id);
        if (!isViewing) {
          setUnreadCount(prev => prev + 1);
          setLastNotification({ name: nm.user_name, content: nm.content, type: nm.type, senderId: nm.user_id });
          playSound();
          setTimeout(() => setLastNotification(null), 6000);
        } else {
          markAsRead(roomId);
        }
      }

      if (view === "chat") {
        const u1 = monitorPair ? monitorPair.u1.id : user.id;
        const u2 = monitorPair ? monitorPair.u2.id : selectedRecipient?.id;
        const isThisRoom = nm.type === chatType && (chatType === "group" || (nm.user_id === u1 && nm.recipient_id === u2) || (nm.user_id === u2 && nm.recipient_id === u1));
        if (isThisRoom) {
          setMessages(prev => {
            const isDup = prev.some(m => m.id === nm.id || (m.content === nm.content && m.user_id === nm.user_id && Math.abs(new Date(m.created_at).getTime() - new Date(nm.created_at).getTime()) < 5000));
            if (isDup) return prev.map(m => (m.content === nm.content && m.user_id === nm.user_id) ? nm : m);
            return [...prev, nm];
          });
          if (isNotMe && isOpen) playSound();
        }
      }
      loadThreads();
    };

    const handleTyping = (e: any) => {
      const { userId, userName, roomId } = e.detail;
      const currentRoomId = getRoomId(chatType, selectedRecipient?.id);
      if (userId !== user.id && roomId === currentRoomId) {
        setTypingUsers(prev => {
          if (prev[userId]) clearTimeout(prev[userId].timeout);
          const timeout = setTimeout(() => {
            setTypingUsers(current => {
              const next = { ...current };
              delete next[userId];
              return next;
            });
          }, 3500);
          return { ...prev, [userId]: { name: userName, timeout } };
        });
      }
    };

    window.addEventListener('chat-msg-evt', handleMsg);
    window.addEventListener('chat-typing-evt', handleTyping);
    return () => {
      window.removeEventListener('chat-msg-evt', handleMsg);
      window.removeEventListener('chat-typing-evt', handleTyping);
    };
  }, [user, isOpen, view, chatType, selectedRecipient, monitorPair, soundEnabled]);

  // 4. History
  useEffect(() => {
    if (!isOpen || view !== "chat" || !user) return;
    const fetchHistory = async () => {
      setIsLoading(true);
      const u1 = monitorPair ? monitorPair.u1.id : user.id;
      const u2 = monitorPair ? monitorPair.u2.id : selectedRecipient?.id;
      if (!monitorPair) markAsRead(getRoomId(chatType, u2));
      let query = supabase.from("internal_messages").select("*");
      if (chatType === "group") query = query.eq("type", "group");
      else query = query.eq("type", "private").or(`user_id.eq.${u1},recipient_id.eq.${u1}`).or(`user_id.eq.${u2},recipient_id.eq.${u2}`);
      const { data } = await query.order("created_at", { ascending: true }).limit(50);
      const filtered = chatType === "private" ? (data || []).filter(m => (m.user_id === u1 && m.recipient_id === u2) || (m.user_id === u2 && m.recipient_id === u1)) : (data || []);
      setMessages(filtered);
      setIsLoading(false);
    };
    fetchHistory();
  }, [view, chatType, selectedRecipient, monitorPair, isOpen, user]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, view, typingUsers]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || monitorPair) return;
    const msgContent = newMessage.trim();
    const tempId = 'temp-' + Date.now();
    const msgData = { id: tempId, user_id: user.id, user_name: user.email?.split("@")[0] || "User", content: msgContent, type: chatType, recipient_id: chatType === "private" ? selectedRecipient?.id : null, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, msgData]);
    setNewMessage("");
    markAsRead(getRoomId(chatType, selectedRecipient?.id));
    const { error } = await supabase.from("internal_messages").insert([{ user_id: user.id, user_name: msgData.user_name, content: msgData.content, type: msgData.type, recipient_id: msgData.recipient_id }]);
    if (error) setMessages(prev => prev.filter(m => m.id !== tempId));
  };

  const onInputChange = (val: string) => {
    setNewMessage(val);
    if (!presenceChannelRef.current || !user) return;
    presenceChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, userName: user.email?.split("@")[0], roomId: getRoomId(chatType, selectedRecipient?.id) }
    });
  };

  const isUnread = (thread: any) => {
    const lastRead = readConversations[thread.roomId];
    if (!lastRead) return thread.user_id !== user?.id;
    return new Date(thread.created_at).getTime() > new Date(lastRead).getTime() && thread.user_id !== user?.id;
  };

  const sortedUsers = useMemo(() => {
    const contacts = [...usersList].filter(u => (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) || (u.department || "").toLowerCase().includes(searchQuery.toLowerCase()));
    return contacts.sort((a, b) => {
      const aOn = onlineUsers.has(a.id);
      const bOn = onlineUsers.has(b.id);
      if (aOn && !bOn) return -1;
      if (!aOn && bOn) return 1;
      const aT = activeConversations.find(c => c.roomId === getRoomId("private", a.id));
      const bT = activeConversations.find(c => c.roomId === getRoomId("private", b.id));
      if (!aT && !bT) return 0;
      if (!aT) return 1;
      if (!bT) return -1;
      return new Date(bT.created_at).getTime() - new Date(aT.created_at).getTime();
    });
  }, [usersList, searchQuery, activeConversations, user, onlineUsers]);

  const groupThread = activeConversations.find(c => c.type === "group");
  const typingList = Object.values(typingUsers);

  return (
    <>
      {/* 🔔 Floating Notification */}
      {lastNotification && !isOpen && (
        <div onClick={() => { if (lastNotification.type === 'group') setChatType('group'); else { const s = usersList.find(u => u.id === lastNotification.senderId); if (s) setSelectedRecipient(s); setChatType('private'); } setView('chat'); setIsOpen(true); setUnreadCount(0); setLastNotification(null); }} className="fixed bottom-24 right-6 z-[1000] bg-white dark:bg-[#242526] p-4 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-blue-500/30 flex items-center gap-4 cursor-pointer animate-in fade-in slide-in-from-right-20 duration-500 max-w-[320px] transition-all hover:scale-105 active:scale-95">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shrink-0 text-xl">{lastNotification.name.charAt(0).toUpperCase()}</div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2"><span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{lastNotification.type === 'group' ? 'แชทกลุ่ม' : 'แชทส่วนตัว'}</span><div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div></div>
            <p className="text-sm font-black text-slate-800 dark:text-white truncate">{lastNotification.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-bold">{lastNotification.content}</p>
          </div>
        </div>
      )}

      {/* Button Launcher */}
      <button onClick={() => { setIsOpen(true); setUnreadCount(0); setLastNotification(null); }} className="fixed bottom-6 right-6 z-[100] w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-[0_10px_40px_rgba(37,99,235,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-90 group">
        <MessageSquare className="w-8 h-8 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black min-w-[22px] h-[22px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-bounce shadow-lg z-[101]">{unreadCount > 99 ? "9+" : unreadCount}</span>}
      </button>

      <div className={`fixed inset-y-0 right-0 w-full sm:w-[440px] bg-white dark:bg-[#1c1e21] shadow-2xl z-[110] transform transition-all duration-500 ease-[cubic-bezier(0.16, 1, 0.3, 1)] border-l dark:border-[#333] flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full opacity-0"}`}>
        
        {/* Header */}
        <div className="px-6 py-4 bg-white dark:bg-[#242526] border-b dark:border-[#333] flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            {view !== "list" && <button onClick={() => { setView("list"); setMonitorPair(null); }} className="hover:bg-slate-100 dark:hover:bg-[#3a3b3c] p-2 rounded-full transition-colors text-slate-500"><ChevronLeft className="w-6 h-6" /></button>}
            <div>
              <h2 className="font-black text-xl text-slate-900 dark:text-white tracking-tight">{view === "list" ? "Messenger" : monitorPair ? "Internal Audit" : getFriendlyName(selectedRecipient)}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px] transition-all duration-500 ${view === 'chat' && chatType === 'private' && onlineUsers.has(selectedRecipient?.id) ? 'bg-emerald-500 shadow-emerald-500/60 scale-110' : 'bg-slate-400'}`}></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {view === 'chat' && chatType === 'private' ? (onlineUsers.has(selectedRecipient?.id) ? 'Online Now' : 'Offline') : `กำลังออนไลน์ ${onlineUsers.size} คน`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-[#3a3b3c] rounded-full text-slate-400">{soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}</button>
            <button onClick={() => setIsOpen(false)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-[#3a3b3c] rounded-full text-slate-400"><X className="w-6 h-6" /></button>
          </div>
        </div>

        {view === "list" ? (
          /* HUB VIEW */
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1c1e21]">
            <div className="p-6 space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" placeholder="Search coworkers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-[#3a3b3c] border-none rounded-2xl text-[15px] focus:ring-2 focus:ring-blue-600 outline-none dark:text-white font-medium shadow-inner" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => { setChatType("group"); setView("chat"); }} className="relative flex flex-col items-center justify-center p-5 bg-blue-500 hover:bg-blue-600 text-white rounded-[32px] shadow-xl shadow-blue-500/20 cursor-pointer transition-all active:scale-95 group">
                  <Users className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="mt-2 text-[13px] font-black uppercase tracking-tighter">Public Group</span>
                  {groupThread && isUnread(groupThread) && <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>}
                </div>
                {isAdmin && <button onClick={() => { setView("admin-dashboard"); }} className="flex flex-col items-center justify-center p-5 bg-slate-800 dark:bg-[#3a3b3c] hover:bg-slate-900 text-white rounded-[32px] shadow-xl active:scale-95 group"><ShieldCheck className="w-8 h-8 group-hover:scale-110 transition-transform text-amber-400" /><span className="mt-2 text-[13px] font-black uppercase tracking-tighter text-slate-300">Admin Audit</span></button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1 custom-scrollbar">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-2">เรียงตามสถานะออนไลน์</h4>
              {sortedUsers.map((u) => {
                const thread = activeConversations.find(c => c.roomId === getRoomId("private", u.id));
                const unread = thread ? isUnread(thread) : false;
                const isOnline = onlineUsers.has(u.id);
                return (
                  <div key={u.id} onClick={() => { setSelectedRecipient(u); setChatType("private"); setView("chat"); }} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-[#242526] rounded-[28px] cursor-pointer transition-all active:scale-[0.98] border border-transparent hover:border-slate-100 dark:hover:border-[#333]">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#3a3b3c] dark:to-[#242526] rounded-[22px] flex items-center justify-center text-slate-600 dark:text-slate-300 font-black text-xl border border-white dark:border-[#333] shadow-sm">{(u.email || "U").charAt(0).toUpperCase()}</div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white dark:border-[#1c1e21] rounded-full shadow-sm transition-all duration-700 ${isOnline ? 'bg-emerald-500 scale-110 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-300 scale-100'}`}></div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center">
                        <p className={`text-[15px] truncate ${unread ? "font-black text-blue-600 dark:text-blue-400" : "font-bold text-slate-800 dark:text-slate-200"}`}>{getFriendlyName(u)}</p>
                        {thread && <span className="text-[10px] text-slate-400 shrink-0 ml-2 font-medium">{format(new Date(thread.created_at), "HH:mm")}</span>}
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${unread ? "font-black text-slate-900 dark:text-white" : "font-medium text-slate-500 dark:text-slate-400"}`}>{thread ? (thread.user_id === user?.id ? `คุณ: ${thread.content}` : thread.content) : (u.department || 'Employee')}</p>
                    </div>
                    {unread && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.8)]"></div>}
                  </div>
                );
              })}
            </div>
          </div>
        ) : view === "admin-dashboard" ? (
          /* ADMIN */
          <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#1c1e21] overflow-hidden">
             <div className="p-4 bg-amber-500 text-white flex items-center gap-3 shadow-lg shrink-0"><ShieldAlert className="w-5 h-5 animate-pulse" /><span className="text-xs font-black uppercase tracking-widest">Internal Security Monitor</span></div>
             <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {activeConversations.map((thread, i) => (
                  <div key={i} onClick={() => { setMonitorPair({ u1: thread.u1, u2: thread.u2 }); setChatType("private"); setView("chat"); }} className="bg-white dark:bg-[#242526] p-5 rounded-[32px] shadow-sm border border-transparent hover:border-amber-400 transition-all cursor-pointer group">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex -space-x-4"><div className="w-12 h-12 rounded-2xl bg-blue-500 border-4 border-white dark:border-[#242526] flex items-center justify-center text-white font-black shadow-lg">{(thread.u1.email || "A").charAt(0).toUpperCase()}</div><div className="w-12 h-12 rounded-2xl bg-purple-500 border-4 border-white dark:border-[#242526] flex items-center justify-center text-white font-black shadow-lg">{(thread.u2.email || "B").charAt(0).toUpperCase()}</div></div>
                      <div className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-[#3a3b3c] px-3 py-1 rounded-full uppercase tracking-tighter">{thread.created_at ? format(new Date(thread.created_at), "HH:mm") : "active"}</div>
                    </div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">{getFriendlyName(thread.u1)} <ArrowRightLeft className="w-4 h-4 text-amber-500" /> {getFriendlyName(thread.u2)}</h3>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic font-medium">"{thread.content}"</p>
                  </div>
                ))}
             </div>
          </div>
        ) : (
          /* CHAT */
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-[#1c1e21] custom-scrollbar relative">
              {isLoading && <div className="absolute inset-0 bg-white/20 dark:bg-black/20 flex items-center justify-center z-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}
              {messages.map((msg, idx) => {
                const isMe = msg.user_id === user?.id;
                const isTemp = msg.id.toString().startsWith('temp-');
                return (
                  <div key={msg.id || idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    {!isMe && chatType === "group" && <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 ml-4 mb-1.5 uppercase tracking-tighter">{msg.user_name}</span>}
                    <div className={`max-w-[85%] px-5 py-3 rounded-[24px] text-[15px] shadow-sm relative group transition-all leading-relaxed ${isMe ? "bg-blue-600 text-white rounded-tr-md shadow-blue-500/20" : "bg-white dark:bg-[#3a3b3c] text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-none rounded-tl-md shadow-slate-200/50"} ${isTemp ? 'opacity-70 grayscale' : ''}`}>
                      {msg.content}
                      <span className={`text-[9px] absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap ${isMe ? "right-2" : "left-2"} text-slate-400 font-black uppercase tracking-tighter`}>{msg.created_at ? format(new Date(msg.created_at), "HH:mm") : "sending"}</span>
                    </div>
                  </div>
                );
              })}
              {typingList.length > 0 && (
                <div className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-1">
                  <div className="bg-slate-200 dark:bg-[#3a3b3c] px-4 py-2 rounded-2xl flex items-center gap-1 shadow-sm"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div></div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-2" />
            </div>
            <form onSubmit={handleSendMessage} className="p-6 bg-white dark:bg-[#242526] border-t dark:border-[#333] shrink-0">
              {monitorPair && <div className="text-[11px] font-black text-amber-600 dark:text-amber-500 text-center mb-4 bg-amber-50 dark:bg-amber-900/10 py-2.5 rounded-2xl border border-amber-100 dark:border-amber-800/30 uppercase tracking-widest">Audit Mode Active</div>}
              <div className="flex gap-3 items-center">
                <input value={newMessage} onChange={(e) => onInputChange(e.target.value)} placeholder={monitorPair ? "Monitoring..." : "Type message..." } disabled={!!monitorPair} className="flex-1 bg-slate-100 dark:bg-[#3a3b3c] border-none rounded-2xl h-14 px-6 text-[15px] focus:ring-2 focus:ring-blue-600 outline-none dark:text-white transition-all shadow-inner font-medium" />
                <Button type="submit" size="icon" disabled={!!monitorPair || !newMessage.trim()} className="bg-blue-600 hover:bg-blue-700 h-14 w-14 shrink-0 rounded-2xl shadow-xl shadow-blue-500/30 active:scale-95 hover:rotate-6"><SendHorizontal className="w-6 h-6" /></Button>
              </div>
            </form>
          </>
        )}
      </div>
      {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/10 dark:bg-black/60 backdrop-blur-[4px] z-[105] animate-in fade-in duration-500"></div>}
      <style jsx global>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(155, 155, 155, 0.3); border-radius: 20px; }`}</style>
    </>
  );
}
