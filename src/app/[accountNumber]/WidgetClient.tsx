"use client";

import { useEffect, useState, useRef } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Account,
  AccountSettings,
  Message,
  MessageAttachment,
  Profile,
} from "@/lib/types";
import MessageList from "@/components/MessageList";
import FileUpload from "@/components/FileUpload";
import { formatFileSize } from "@/lib/utils/file-upload";

interface WidgetClientProps {
  account: Account;
  settings: AccountSettings;
  ownerProfile: Profile | null;
}

const STORAGE_KEY = "livechat_widget_session";

interface WidgetSession {
  visitorId: string;
  customerName: string;
  customerEmail: string;
  roomId: string;
}

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("livechat_visitor_id");
  if (!id) {
    id = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("livechat_visitor_id", id);
  }
  return id;
}

const fontFamilies = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter", -apple-system, sans-serif',
  roboto: '"Roboto", sans-serif',
  poppins: '"Poppins", sans-serif',
  playfair: '"Playfair Display", serif',
};

/**
 * Get readable text color (black or white) based on background luminance.
 * Ensures WCAG-compliant contrast for message bubbles.
 */
function getContrastText(bgColor: string): string {
  // Default to white text
  if (!bgColor || bgColor === "transparent") return "#111827";

  // Handle gradient/image - default to white
  if (bgColor.startsWith("linear-gradient") || bgColor.startsWith("url(")) {
    return "#ffffff";
  }

  // Parse hex color
  let hex = bgColor.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length !== 6) return "#111827";

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Light bg → dark text, Dark bg → light text
  return luminance > 0.6 ? "#111827" : "#ffffff";
}

export default function WidgetClient({
  account,
  settings,
  ownerProfile,
}: WidgetClientProps) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [step, setStep] = useState<"form" | "prechat" | "chat">("form");
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [preChatData, setPreChatData] = useState<Record<string, string>>({});
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState<"open" | "closed">("open");
  const [roomBanned, setRoomBanned] = useState(false);
  const [bannedReason, setBannedReason] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-close settings
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity

  // Close chat room - updates status to "closed" in database
  async function closeChatRoom() {
    if (!supabase || !roomId) return;
    await supabase
      .from("chat_rooms")
      .update({ status: "closed" })
      .eq("id", roomId);
  }

  // Reset inactivity timer - called on user activity
  function resetInactivityTimer() {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Don't start timer if chat is already closed or no room
    if (!roomId || roomStatus === "closed") return;
    inactivityTimerRef.current = setTimeout(() => {
      if (roomStatus === "open") {
        void closeChatRoom();
      }
    }, INACTIVITY_TIMEOUT);
  }

  // Colors with fallbacks
  const isDark = settings.widget_theme === "dark";
  const headerBg = settings.header_bg_color || settings.widget_color || "#3b82f6";
  const customerBubble = settings.customer_bubble_color || settings.widget_color || "#3b82f6";
  const agentBubble = settings.agent_bubble_color || (isDark ? "#374151" : "#f3f4f6");
  const pageBgColor = settings.page_bg_color || (isDark ? "#0f172a" : "#ffffff");
  const pageBgType = settings.page_bg_type || "color";
  const pageBgGradient = settings.page_bg_gradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  const pageBgImage = settings.page_bg_image || "";

  // Text colors with proper contrast (WCAG AA compliant)
  const textColor = isDark ? "#f1f5f9" : "#111827";           // main text
  const subtitleColor = isDark ? "#94a3b8" : "#6b7280";      // subtitle
  const headerTextColor = settings.header_text_color || "#ffffff";
  const inputBg = isDark ? "#1e293b" : "#ffffff";
  const inputBorder = isDark ? "#475569" : "#d1d5db";
  const inputText = isDark ? "#f1f5f9" : "#111827";
  const inputPlaceholder = isDark ? "#64748b" : "#9ca3af";
  const cardBg = isDark ? "#1e293b" : "#ffffff";
  const cardBorder = isDark ? "#334155" : "#e5e7eb";
  const mutedBg = isDark ? "#0f172a" : "#f9fafb";
  const poweredByColor = isDark ? "#64748b" : "#9ca3af";

  const agentName = settings.agent_name || "Customer Support";
  const agentTitle = settings.agent_title || "Product Expert";
  const agentAvatar = settings.agent_avatar || ownerProfile?.avatar_url || "";

  // DEBUG: log avatar sources to console (visible in browser F12)
  useEffect(() => {
    console.log("[Widget] === Avatar Debug ===");
    console.log("[Widget] settings.agent_avatar:", settings.agent_avatar);
    console.log("[Widget] ownerProfile:", ownerProfile);
    console.log("[Widget] ownerProfile?.avatar_url:", ownerProfile?.avatar_url);
    console.log("[Widget] Final agentAvatar:", agentAvatar);
  }, [agentAvatar, ownerProfile, settings.agent_avatar]);
  const pageTitle = settings.page_title || settings.widget_title || "Chat dengan kami";
  const pageSubtitle = settings.page_subtitle || settings.welcome_message || "Get instant, personalized support with our live chat feature. Get answers to your questions by interacting with the chat box.";
  const pageLabel = settings.page_title || "Chat with our support team";
  const fontFamily = fontFamilies[(settings.font_family as keyof typeof fontFamilies) || "system"];

  // Page background
  const pageBgStyle =
    pageBgType === "gradient"
      ? { background: pageBgGradient }
      : pageBgType === "image" && pageBgImage
      ? { backgroundImage: `url(${pageBgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: pageBgColor };

  // Init Supabase + restore session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    setSupabase(client);

    void trackVisitor(client);

    // Restore session
    const session = localStorage.getItem(STORAGE_KEY);
    if (session) {
      try {
        const parsed = JSON.parse(session) as WidgetSession;
        if (parsed.visitorId && parsed.roomId) {
          setName(parsed.customerName);
          setEmail(parsed.customerEmail);
          setRoomId(parsed.roomId);
          setStep("chat");
          setIsOpen(true);
        }
      } catch {}
    }

    if (settings.custom_css) {
      const style = document.createElement("style");
      style.textContent = settings.custom_css;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to messages
  useEffect(() => {
    if (!supabase || !roomId) return;
    fetchMessages();
    fetchRoomStatus();

    const channel = supabase
      .channel(`widget-${roomId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("[Widget] Realtime INSERT:", payload);
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as read immediately if it's an agent message
          if (newMsg.sender_type === "agent" && !newMsg.read_at && supabase) {
            void supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", newMsg.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("[Widget] Realtime UPDATE:", payload);
          const updatedMsg = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("[Widget] Realtime DELETE payload:", payload);
          // payload.old might be null in some cases, try multiple ways to get id
          const oldRecord = payload.old as { id?: string; room_id?: string } | null;
          const deletedId =
            oldRecord?.id || (payload as { ids?: string[] }).ids?.[0];
          if (deletedId) {
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
            console.log("[Widget] Deleted message:", deletedId);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updated = payload.new as {
            status?: "open" | "closed";
            is_banned?: boolean;
            banned_reason?: string | null;
          };
          if (updated.status) setRoomStatus(updated.status);
          if (typeof updated.is_banned === "boolean") {
            setRoomBanned(updated.is_banned);
            setBannedReason(updated.banned_reason || null);
          }
        }
      )
      .subscribe((status, err) => {
        console.log("[Widget] Subscribe status:", status, err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, supabase]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track page changes
  useEffect(() => {
    if (!supabase) return;
    const sendPageUpdate = () => {
      void supabase.from("visitors").upsert(
        {
          account_id: account.id,
          visitor_id: getOrCreateVisitorId(),
          current_page: window.location.href,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "account_id,visitor_id" }
      );
    };
    const handler = () => {
      if (document.visibilityState === "visible") {
        sendPageUpdate();
        resetInactivityTimer();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [supabase, account.id]);

  // Inactivity auto-close: 5 minutes of no activity = auto close
  useEffect(() => {
    if (!roomId || roomStatus === "closed") return;

    // Start the inactivity timer when chat opens
    resetInactivityTimer();

    // Track user activity events to reset timer
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handleActivity = () => resetInactivityTimer();

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [roomId, roomStatus]);

  // Close chat when customer closes tab/leaves
  useEffect(() => {
    if (!roomId || roomStatus === "closed") return;

    const handleBeforeUnload = () => {
      // Close chat room when customer leaves - use keepalive fetch
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && anonKey && roomId) {
        void fetch(`${url}/rest/v1/chat_rooms?id=eq.${roomId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": anonKey,
            "Authorization": `Bearer ${anonKey}`,
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({ status: "closed" }),
          keepalive: true,
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Also handle Supabase channel disconnect
    const supabaseClient = supabase;
    const channel = supabaseClient?.channel(`widget-close-${roomId}`);
    if (channel) {
      channel.on("system", { event: "disconnect" }, () => {
        void closeChatRoom();
      });
      channel.subscribe();
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (channel) {
        supabaseClient?.removeChannel(channel);
      }
    };
  }, [roomId, roomStatus, supabase]);

  async function trackVisitor(client: SupabaseClient) {
    const visitorId = getOrCreateVisitorId();
    await client.from("visitors").upsert(
      {
        account_id: account.id,
        visitor_id: visitorId,
        current_page: window.location.href,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "account_id,visitor_id" }
    );
  }

  async function fetchMessages() {
    if (!supabase || !roomId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .returns<Message[]>();
    if (data) {
      setMessages(data);
      // Mark unread agent messages as read
      void markAgentMessagesAsRead(data);
    }
  }

  async function fetchRoomStatus() {
    if (!supabase || !roomId) return;
    const { data } = await supabase
      .from("chat_rooms")
      .select("status, is_banned, banned_reason")
      .eq("id", roomId)
      .single();
    if (data) {
      setRoomStatus((data.status as "open" | "closed") || "open");
      setRoomBanned(data.is_banned || false);
      setBannedReason(data.banned_reason || null);
    }
  }

  async function markAgentMessagesAsRead(msgs: Message[]) {
    if (!supabase) return;
    const unread = msgs.filter(
      (m) => m.sender_type === "agent" && !m.read_at
    );
    if (unread.length === 0) return;
    const ids = unread.map((m) => m.id);
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
  }

  async function startChat(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      console.error("[startChat] No supabase client!");
      return;
    }
    setError(null);

    console.log("[startChat] Called with step:", step, "name:", name, "preChatData:", preChatData);

    // Determine which form data to use
    // Try common name keys first, then fallback to first pre-chat field value
    let finalName = "";
    if (step === "prechat") {
      // Try common keys
      const nameKeys = ["Name", "Nama", "name", "nama"];
      for (const key of nameKeys) {
        if (preChatData[key]) {
          finalName = preChatData[key];
          break;
        }
      }
      // Fallback: take first non-empty value from preChatData
      if (!finalName) {
        for (const key of Object.keys(preChatData)) {
          if (preChatData[key]) {
            finalName = preChatData[key];
            console.log("[startChat] Using fallback first value from key:", key);
            break;
          }
        }
      }
    } else {
      finalName = name.trim();
    }

    console.log("[startChat] Final name:", finalName);

    if (!finalName) {
      console.error("[startChat] No name provided!");
      setError(
        "Nama harus diisi. Pastikan field 'Nama' ada di pre-chat form (panel settings) atau isi form utama."
      );
      return;
    }

    // Auto-fill email if empty (anonymous)
    const visitorId = getOrCreateVisitorId();
    const finalEmail =
      email.trim() || `visitor-${visitorId.slice(-8)}@anonymous.local`;

    try {
      const { data: existing } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("account_id", account.id)
        .eq("customer_email", finalEmail)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let currentRoomId: string;

      if (existing) {
        currentRoomId = existing.id;
        await supabase
          .from("chat_rooms")
          .update({
            visitor_id: visitorId,
            visitor_page: window.location.href,
            visitor_referrer: document.referrer || null,
            visitor_user_agent: navigator.userAgent,
            pre_chat_data: Object.keys(preChatData).length > 0 ? preChatData : null,
            status: "open",
          })
          .eq("id", currentRoomId);
      } else {
        const { data: newRoom, error } = await supabase
          .from("chat_rooms")
          .insert({
            account_id: account.id,
            customer_email: finalEmail,
            customer_name: finalName,
            visitor_id: visitorId,
            visitor_page: window.location.href,
            visitor_referrer: document.referrer || null,
            visitor_user_agent: navigator.userAgent,
            pre_chat_data: Object.keys(preChatData).length > 0 ? preChatData : null,
            status: "open",
          })
          .select()
          .single();

        if (error || !newRoom) {
          console.error("[Widget] chat_rooms insert failed:", {
            error,
            payload: {
              account_id: account.id,
              customer_email: finalEmail,
              customer_name: finalName,
              visitor_id: visitorId,
              status: "open",
            },
          });
          setError(`Gagal memulai chat: ${error?.message || JSON.stringify(error) || "Unknown"}`);
          return;
        }
        currentRoomId = newRoom.id;
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          visitorId,
          customerName: finalName,
          customerEmail: finalEmail,
          roomId: currentRoomId,
        })
      );

      setRoomId(currentRoomId);
      setRoomStatus("open");
      setStep("chat");
      setIsOpen(true);
      // Start inactivity timer for new session
      resetInactivityTimer();
    } catch (err) {
      setError("Gagal memulai chat. Coba lagi.");
      console.error(err);
    }
  }

  async function sendMessage() {
    if (!supabase || !roomId || !input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    await supabase.from("messages").insert({
      room_id: roomId,
      sender_type: "customer",
      content,
    });
    // Reset inactivity timer on message send
    resetInactivityTimer();
    setSending(false);
  }

  function endChat() {
    if (confirm("Tutup chat ini? History akan tersimpan tapi lu ga bisa reply lagi.")) {
      localStorage.removeItem(STORAGE_KEY);
      setStep("form");
      setIsOpen(false);
      setRoomId(null);
      setMessages([]);
      setName("");
      setEmail("");
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ ...pageBgStyle, fontFamily }}
    >
      {/* Top bar - ala Text.com */}
      <header
        className="w-full border-b flex-shrink-0"
        style={{
          background: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDark ? "#334155" : "#e5e7eb",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <a
            href={`/${account.account_number}`}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            {/* LiveChat Logo */}
            <div className="flex items-center gap-1.5">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 3h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2z"
                  fill={headerBg}
                />
              </svg>
              <span
                className="font-bold text-sm"
                style={{ color: textColor }}
              >
                LiveChat
              </span>
            </div>
          </a>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex items-stretch sm:items-center justify-center px-0 sm:px-4 py-0 sm:py-12">
        <div className="w-full max-w-md">
          {/* Logo avatar + label — only show BEFORE chat starts */}
          {step === "form" && !isOpen && (
            <div className="text-center mb-6 px-4 sm:px-0">
              <div className="flex justify-center mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden"
                  style={{ background: headerBg }}
                >
                  {agentAvatar ? (
                    <img
                      src={agentAvatar}
                    alt={account.company_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  account.company_name.charAt(0).toUpperCase()
                )}
              </div>
            </div>
            <p className="text-xs mb-1" style={{ color: subtitleColor }}>
              {pageLabel}
            </p>
            <h1
              className="text-2xl font-bold mb-2"
              style={{ color: textColor, fontSize: "1.5rem", lineHeight: "2rem" }}
            >
              Hello!
            </h1>
            <p
              className="text-sm max-w-sm mx-auto leading-relaxed"
              style={{ color: subtitleColor, fontSize: "0.875rem", lineHeight: "1.25rem" }}
            >
              {pageSubtitle}
            </p>
          </div>
          )}

          {/* Start chat button */}
          {!isOpen && step !== "chat" && (
            <button
              onClick={() => {
                // If pre-chat enabled with fields, go directly to prechat step
                if (
                  settings.pre_chat_enabled &&
                  settings.pre_chat_fields &&
                  settings.pre_chat_fields.length > 0
                ) {
                  setStep("prechat");
                }
                setIsOpen(true);
              }}
              className="w-full text-white font-medium py-3 rounded-lg transition text-sm shadow-sm"
              style={{ background: headerBg }}
            >
              Start the chat
            </button>
          )}

          {/* Start chat button */}

          {/* Open chat - show form inline */}
          {isOpen && step === "form" && (
            <div
              className="sm:rounded-2xl sm:shadow-xl overflow-hidden w-full"
              style={{ background: cardBg }}
            >
              <div
                className="px-4 py-3 flex items-center gap-3"
                style={{ background: headerBg, color: "white" }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden bg-white/20">
                  {agentAvatar ? (
                    <img
                      src={agentAvatar}
                      alt={agentName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error("[Widget] Avatar failed to load:", agentAvatar);
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  {!agentAvatar && agentName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{agentName}</p>
                  <p className="text-xs opacity-90 truncate">{agentTitle}</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 rounded-full p-1.5"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <form onSubmit={startChat} className="p-6 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Your name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900 placeholder-gray-900 focus:ring-2 focus:border-transparent outline-none"
                    style={{
                      background: inputBg,
                      borderColor: inputBorder,
                      color: inputText,
                    }}
                    placeholder="Masukkan nama lu"
                  />
                </div>
                {error && (
                  <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full text-white font-medium py-2.5 rounded-lg transition text-sm"
                  style={{ background: headerBg }}
                >
                  Start the chat
                </button>
              </form>
            </div>
          )}

          {isOpen && step === "prechat" && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div
                className="px-4 py-3 flex items-center gap-3"
                style={{ background: headerBg, color: "white" }}
              >
                <button
                  onClick={() => setStep("form")}
                  className="hover:bg-white/20 rounded-full p-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <p className="font-semibold text-sm">A few more details</p>
              </div>
              <form onSubmit={startChat} className="p-6 space-y-3">
                {settings.pre_chat_fields.map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      {field.label}
                      {field.required && " *"}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        required={field.required}
                        value={preChatData[field.label] || ""}
                        onChange={(e) =>
                          setPreChatData({
                            ...preChatData,
                            [field.label]: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 outline-none"
                      />
                    ) : (
                      <input
                        type={field.type}
                        required={field.required}
                        value={preChatData[field.label] || ""}
                        onChange={(e) =>
                          setPreChatData({
                            ...preChatData,
                            [field.label]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 outline-none"
                      />
                    )}
                  </div>
                ))}
                <button
                  type="submit"
                  className="w-full text-white font-medium py-2.5 rounded-lg transition text-sm"
                  style={{ background: headerBg }}
                >
                  Start the chat
                </button>
              </form>
            </div>
          )}

          {/* Chat view */}
          {isOpen && step === "chat" && (
            <div
              className="sm:rounded-2xl sm:shadow-xl overflow-hidden flex flex-col h-[calc(100vh-3.5rem)] sm:h-[600px] sm:max-h-[80vh] w-full"
              style={{ background: cardBg }}
            >
              <div
                className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
                style={{ background: headerBg, color: "white" }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden bg-white/20">
                  {agentAvatar ? (
                    <img
                      src={agentAvatar}
                      alt={agentName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error("[Widget] Avatar failed to load:", agentAvatar);
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  {!agentAvatar && agentName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm truncate">{agentName}</p>
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-xs opacity-90 truncate">{agentTitle}</p>
                </div>
                <button
                  onClick={endChat}
                  className="hover:bg-white/20 rounded-full p-1.5"
                  title="End chat"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                style={{ background: mutedBg }}
              >
                {messages.length === 0 && (
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold"
                      style={{ background: headerBg }}
                    >
                      {agentAvatar ? (
                        <img
                          src={agentAvatar}
                          alt={agentName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        agentName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div
                        className="rounded-2xl rounded-tl-sm px-3 py-2 inline-block max-w-full break-words"
                        style={{ background: agentBubble, color: "#111827" }}
                      >
                        <p className="text-sm">
                          Halo! {agentName} di sini. Ada yang bisa saya bantu? 👋
                        </p>
                      </div>
                      <p className="text-[10px] text-gray-900 mt-0.5 ml-1">Just now</p>
                    </div>
                  </div>
                )}

                {messages.map((msg) => {
                  const isCustomer = msg.sender_type === "customer";
                  const hasAttachments =
                    msg.attachments && msg.attachments.length > 0;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 ${
                        isCustomer ? "justify-end" : ""
                      }`}
                    >
                      {!isCustomer && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold overflow-hidden"
                          style={{ background: headerBg }}
                        >
                          {agentAvatar ? (
                            <img
                              src={agentAvatar}
                              alt={agentName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            agentName.charAt(0).toUpperCase()
                          )}
                        </div>
                      )}
                      <div
                        className={`${
                          isCustomer ? "flex justify-end" : ""
                        } flex-1`}
                      >
                        <div
                          className={`rounded-2xl ${
                            hasAttachments ? "p-2" : "px-3 py-2"
                          } inline-block max-w-full break-words ${
                            isCustomer ? "rounded-tr-sm" : "rounded-tl-sm"
                          }`}
                          style={{
                            background: isCustomer
                              ? customerBubble
                              : agentBubble,
                            // Text color logic for proper contrast
                            color: isCustomer
                              ? getContrastText(customerBubble)
                              : getContrastText(agentBubble),
                          }}
                        >
                          {/* Attachments */}
                          {hasAttachments && (
                            <div className="space-y-2 mb-1">
                              {msg.attachments!.map((att, i) => {
                                const isImage = att.type?.startsWith("image/");
                                if (isImage) {
                                  return (
                                    <a
                                      key={i}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block"
                                    >
                                      <img
                                        src={att.url}
                                        alt={att.name}
                                        className="rounded-lg max-w-full max-h-64 object-cover"
                                        loading="lazy"
                                      />
                                    </a>
                                  );
                                }
                                return (
                                  <a
                                    key={i}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
                                  >
                                    <div className="w-10 h-10 rounded bg-white/30 flex items-center justify-center flex-shrink-0">
                                      <span className="text-lg">📄</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">
                                        {att.name}
                                      </p>
                                      <p className="text-[10px] opacity-80">
                                        {att.size &&
                                          (att.size / 1024).toFixed(1) + " KB"}
                                      </p>
                                    </div>
                                  </a>
                                );
                              })}
                            </div>
                          )}

                          {/* Text content */}
                          {msg.content && !msg.content.startsWith("📎 ") && (
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          )}
                        </div>
                        <p
                          className={`text-[10px] text-gray-900 mt-0.5 flex items-center gap-1 ${
                            isCustomer ? "mr-1 justify-end" : "ml-1"
                          }`}
                        >
                          <span>{formatTime(msg.created_at)}</span>
                          {isCustomer && (
                            <span
                              className={msg.read_at ? "text-blue-500" : "text-gray-900"}
                              title={msg.read_at ? "Read" : "Sent"}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 16 16"
                                fill="none"
                                className="inline-block"
                              >
                                <path
                                  d="M1 8.5L4 11.5L9 5.5"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M6 8.5L9 11.5L14 5.5"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div
                className="border-t p-3 flex-shrink-0"
                style={{
                  borderColor: cardBorder,
                  background: cardBg,
                }}
              >
                {roomBanned ? (
                  <div className="text-center py-3">
                    <p className="text-sm text-red-600 font-medium">
                      🚫 Kamu di-ban dari chat ini
                    </p>
                    {bannedReason && (
                      <p className="text-xs text-gray-900 mt-1">
                        Alasan: {bannedReason}
                      </p>
                    )}
                  </div>
                ) : roomStatus === "closed" ? (
                  <div className="text-center py-3">
                    <p className="text-sm text-gray-900 font-medium">
                      Chat ini udah ditutup
                    </p>
                    <button
                      onClick={() => {
                        if (
                          confirm("Mulai chat baru? History sebelumnya tetap tersimpan.")
                        ) {
                          setStep("form");
                          setIsOpen(false);
                          setRoomId(null);
                          setRoomStatus("open");
                          setRoomBanned(false);
                          setMessages([]);
                          setName("");
                          setEmail("");
                          localStorage.removeItem(STORAGE_KEY);
                        }
                      }}
                      className="mt-2 text-xs px-4 py-1.5 rounded text-white font-medium"
                      style={{ background: headerBg }}
                    >
                      Start new chat
                    </button>
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <FileUpload
                      bucket="attachments"
                      path={`widget/${account.id}`}
                    accept="image/*,application/pdf,.txt,.doc,.docx"
                    multiple
                    onUpload={async (url, file) => {
                      if (!supabase || !roomId) return;
                      const attachment: MessageAttachment = {
                        url,
                        type: file.type,
                        name: file.name,
                        size: file.size,
                      };
                      await supabase.from("messages").insert({
                        room_id: roomId,
                        sender_type: "customer",
                        content: input.trim() || `📎 ${file.name}`,
                        attachments: [attachment],
                      });
                      setInput("");
                    }}
                  >
                    {({ onClick, uploading }) => (
                      <button
                        type="button"
                        onClick={onClick}
                        disabled={uploading}
                        className="p-2 hover:bg-gray-100 rounded text-gray-900 disabled:opacity-50"
                        title="Attach file"
                      >
                        {uploading ? (
                          <svg
                            className="w-5 h-5 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </FileUpload>
                  <textarea
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      resetInactivityTimer();
                      // Send typing broadcast to admin
                      if (supabase && roomId) {
                        const channel = supabase.channel(`typing-${roomId}`);
                        channel.send({
                          type: "broadcast",
                          event: "typing",
                          payload: { user: "customer", roomId },
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Write a message..."
                    rows={1}
                    className="flex-1 resize-none px-3 py-2 text-sm text-gray-900 border-0 focus:ring-0 outline-none placeholder-gray-900 max-h-32"
                    style={{
                      background: "transparent",
                      color: inputText,
                    }}
                  />
                  <button className="p-2 hover:bg-gray-100 rounded text-gray-900">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="p-2 rounded-full text-white transition disabled:opacity-50"
                    style={{ background: headerBg }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 10l7-7m0 0l7 7m-7-7v18"
                      />
                    </svg>
                  </button>
                </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}