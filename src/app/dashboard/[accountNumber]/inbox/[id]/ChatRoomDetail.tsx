"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatRoom, Message, CannedResponse } from "@/lib/types";
import MessageList from "@/components/MessageList";
import ChatAdminActions from "@/components/ChatAdminActions";
import FileUpload from "@/components/FileUpload";
import { formatFileSize } from "@/lib/utils/file-upload";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { playNewMessageSound } from "@/lib/sounds";

interface ChatRoomDetailProps {
  room: ChatRoom;
  accountId: string;
  userId: string;
  cannedResponses: CannedResponse[];
  basePath: string;
}

export default function ChatRoomDetail({
  room: initialRoom,
  accountId,
  userId,
  cannedResponses,
  basePath,
}: ChatRoomDetailProps) {
  const [room, setRoom] = useState<ChatRoom>(initialRoom);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showCanned, setShowCanned] = useState(false);
  const [cannedFilter, setCannedFilter] = useState("");
  const [sending, setSending] = useState(false);
  const [customerTyping, setCustomerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedSoundRef = useRef(false);
  const supabase = createClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`room-${room.id}-${Date.now()}`) // unique channel per session
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          console.log("[Realtime] INSERT message:", payload);
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          // Play sound if it's a customer message (not from current agent)
          if (newMessage.sender_type === "customer") {
            console.log("[Sound] New customer message, playing sound");
            playNewMessageSound();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          console.log("[Realtime] UPDATE message:", payload);
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updatedMessage.id ? updatedMessage : m
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          console.log("[Realtime] DELETE payload:", payload);
          // payload.old might be null — fallback to use any available id
          const oldRecord = payload.old as { id?: string } | null;
          const deletedId = oldRecord?.id;
          if (deletedId) {
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
          }
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime] Subscribe status:", status, err);
      });

    // Typing indicator channel (broadcast)
    const typingChannel = supabase
      .channel(`typing-${room.id}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        console.log("[Typing]", payload);
        if ((payload.payload as { user: string }).user === "customer") {
          setCustomerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setCustomerTyping(false);
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
    };
  }, [room.id, supabase]);

  // Realtime: auto-redirect to inbox when chat is closed (customer left or auto-close)
  useEffect(() => {
    const roomChannel = supabase
      .channel(`room-status-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          const updated = payload.new as { status?: string };
          // Redirect to inbox when status changes to "closed"
          if (updated.status === "closed") {
            router.push(`${basePath}/inbox`);
          } else if (updated.status === "open") {
            setRoom((prev) => ({ ...prev, status: "open" }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [room.id, supabase, router, basePath]);

  // Listen for refetch events from MessageList (fallback for realtime)
  useEffect(() => {
    const handler = () => {
      console.log("[ChatRoomDetail] Refetching messages...");
      void fetchMessages();
    };
    window.addEventListener("livechat-refetch", handler);
    return () => window.removeEventListener("livechat-refetch", handler);
  }, []);

  async function fetchMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .returns<Message[]>();
    if (data) {
      setMessages(data);
      // Mark all customer messages as read
      await markCustomerMessagesAsRead(data);
      // Trigger inbox refresh
      window.dispatchEvent(new CustomEvent("inbox-refresh"));
    }
  }

  async function markCustomerMessagesAsRead(msgs: Message[]) {
    const unreadIds = msgs
      .filter((m) => m.sender_type === "customer" && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    setShowCanned(false);
    await supabase.from("messages").insert({
      room_id: room.id,
      sender_type: "agent",
      sender_id: userId,
      content,
    });
    setSending(false);
  }

  async function toggleStatus() {
    const newStatus = room.status === "open" ? "closed" : "open";
    const { error } = await supabase
      .from("chat_rooms")
      .update({ status: newStatus })
      .eq("id", room.id);
    if (!error) {
      setRoom({ ...room, status: newStatus });
      // Redirect to inbox when closing chat
      if (newStatus === "closed") {
        router.push(`${basePath}/inbox`);
      }
    }
  }

  function handleInputChange(value: string) {
    setInput(value);
    // Detect # for canned responses
    if (value.includes("#") && value.endsWith(" ")) {
      setShowCanned(true);
    } else {
      setShowCanned(false);
    }
  }

  function insertCanned(response: CannedResponse) {
    // If response has attachment, send immediately with attachment
    if (response.attachment_url && response.attachment_type) {
      void sendCannedWithAttachment(response);
      setShowCanned(false);
      return;
    }
    setInput(response.text);
    setShowCanned(false);
    inputRef.current?.focus();
  }

  async function sendCannedWithAttachment(response: CannedResponse) {
    setSending(true);
    const attachment = [
      {
        url: response.attachment_url!,
        type: response.attachment_type!,
        name: response.attachment_name || "file",
        size: response.attachment_size || 0,
      },
    ];
    await supabase.from("messages").insert({
      room_id: room.id,
      sender_type: "agent",
      sender_id: userId,
      content: response.text,
      attachments: attachment,
    });
    setSending(false);
  }

  const filteredCanned = cannedResponses.filter((c) =>
    cannedFilter
      ? c.shortcut.toLowerCase().includes(cannedFilter.toLowerCase())
      : true
  );

  const preChat = room.pre_chat_data as Record<string, string> | null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-9rem)]">
      {/* Main chat */}
      <div className="lg:col-span-3 flex flex-col bg-white border border-gray-900 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href={`${basePath}/inbox`}
              className="md:hidden p-1 -ml-1 hover:bg-gray-100 rounded"
            >
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {room.customer_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-gray-900 truncate">
                {room.customer_name}
              </h2>
              <p className="text-xs text-gray-900 truncate">
                {room.customer_email || "Anonymous"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={toggleStatus}
              className={`text-xs px-3 py-1.5 rounded-md font-medium ${
                room.status === "open"
                  ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  : "bg-green-100 text-gray-900 hover:bg-green-200"
              }`}
            >
              {room.status === "open" ? "Close" : "Reopen"}
            </button>
            <button
              onClick={() => fetchMessages()}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-900"
              title="Refresh messages"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <ChatAdminActions
              room={room}
              onRoomUpdate={setRoom}
              onClearMessages={() => setMessages([])}
            />
          </div>
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          currentUserType="agent"
          currentUserId={userId}
          showAdminActions={true}
          onMessagesUpdate={setMessages}
        />

        {/* Typing indicator */}
        {customerTyping && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-2 text-sm text-gray-900">
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span>{room.customer_name} lagi ngetik...</span>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 p-3 relative flex-shrink-0">
          {showCanned && filteredCanned.length > 0 && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-900 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  value={cannedFilter}
                  onChange={(e) => setCannedFilter(e.target.value)}
                  placeholder="Cari shortcut..."
                  className="w-full text-sm px-2 py-1 border border-gray-900 rounded outline-none placeholder-gray-900"
                  autoFocus
                />
              </div>
              {filteredCanned.map((c) => (
                <button
                  key={c.id}
                  onClick={() => insertCanned(c)}
                  className="w-full text-left p-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                >
                  <div className="font-medium text-brand-600">
                    #{c.shortcut}
                  </div>
                  <div className="text-gray-900 truncate">{c.text}</div>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowCanned(!showCanned)}
              disabled={cannedResponses.length === 0}
              className="p-2 hover:bg-gray-100 rounded text-gray-900 disabled:opacity-30 flex-shrink-0"
              title="Canned responses"
            >
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
                  d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                />
              </svg>
            </button>
            <FileUpload
              bucket="attachments"
              path={`admin/${accountId}`}
              accept="image/*,application/pdf,.txt,.doc,.docx"
              onUpload={async (url, file) => {
                const attachment = [
                  {
                    url,
                    type: file.type,
                    name: file.name,
                    size: file.size,
                  },
                ];
                await supabase.from("messages").insert({
                  room_id: room.id,
                  sender_type: "agent",
                  sender_id: userId,
                  content: input.trim() || `📎 ${file.name}`,
                  attachments: attachment,
                });
                setInput("");
              }}
            >
              {({ onClick, uploading }) => (
                <button
                  type="button"
                  onClick={onClick}
                  disabled={uploading || room.status === "closed"}
                  className="p-2 hover:bg-gray-100 rounded text-gray-900 disabled:opacity-50 flex-shrink-0"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
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
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                  )}
                </button>
              )}
            </FileUpload>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Tulis pesan..."
              rows={1}
              disabled={room.status === "closed"}
              className="flex-1 resize-none px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 placeholder-gray-900 outline-none max-h-32 disabled:bg-gray-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending || room.status === "closed"}
              className="bg-brand-600 hover:bg-brand-700 text-white p-2.5 rounded-lg transition disabled:opacity-50 flex-shrink-0"
            >
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar: Visitor info */}
      <div className="hidden lg:flex flex-col bg-white border border-gray-900 rounded-xl overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Klien</h3>
        </div>

        <div className="p-4 space-y-4 text-sm">
          <div>
            <p className="text-xs text-gray-900 mb-1">Email</p>
            <p className="text-gray-900">{room.customer_email || "—"}</p>
          </div>

          {room.visitor_page && (
            <div>
              <p className="text-xs text-gray-900 mb-1">Halaman saat ini</p>
              <p className="text-gray-900 text-xs break-all">
                {room.visitor_page}
              </p>
            </div>
          )}

          {room.visitor_country && (
            <div>
              <p className="text-xs text-gray-900 mb-1">Lokasi</p>
              <p className="text-gray-900">
                {room.visitor_city ? `${room.visitor_city}, ` : ""}
                {room.visitor_country}
              </p>
            </div>
          )}

          {room.visitor_referrer && (
            <div>
              <p className="text-xs text-gray-900 mb-1">Dari</p>
              <p className="text-gray-900 text-xs break-all">
                {room.visitor_referrer}
              </p>
            </div>
          )}

          {preChat && Object.keys(preChat).length > 0 && (
            <div>
              <p className="text-xs text-gray-900 mb-2 font-medium">
                Pre-chat form
              </p>
              <div className="space-y-2 bg-gray-50 rounded p-3">
                {Object.entries(preChat).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-gray-900">{key}</p>
                    <p className="text-gray-900 text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-900 mb-1">Mulai chat</p>
            <p className="text-gray-900 text-xs">
              {new Date(room.created_at).toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}