"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message, ChatRoom, Account } from "@/lib/types";
import MessageList from "@/components/MessageList";
import Link from "next/link";

interface Props {
  room: ChatRoom & { accounts: Pick<Account, "id" | "company_name" | "account_number" | "status"> | Account[] };
  masterId: string;
}

export default function MasterChatView({ room: initialRoom, masterId }: Props) {
  const [room, setRoom] = useState(initialRoom);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  const accountData = Array.isArray(room.accounts) ? room.accounts[0] : room.accounts;

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`master-room-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, supabase]);

  async function fetchMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .returns<Message[]>();
    if (data) setMessages(data);
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    await supabase.from("messages").insert({
      room_id: room.id,
      sender_type: "agent",
      sender_id: masterId,
      content,
    });
    setSending(false);
  }

  async function closeRoom() {
    if (!confirm("Tutup chat ini?")) return;
    const { error } = await supabase
      .from("chat_rooms")
      .update({ status: "closed" })
      .eq("id", room.id);
    if (!error) setRoom({ ...room, status: "closed" });
  }

  async function deleteRoom() {
    if (
      !confirm(
        "Hapus chat ini PERMANEN? Semua messages juga akan ikut terhapus."
      )
    )
      return;
    const { error } = await supabase.from("chat_rooms").delete().eq("id", room.id);
    if (!error) {
      window.location.href = "/master/chats";
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-12rem)]">
      <div className="lg:col-span-3 flex flex-col bg-white border border-gray-900 rounded-xl overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href="/master/chats"
              className="text-gray-900 hover:text-gray-900"
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
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-gray-900 truncate">
                {room.customer_name}
              </h2>
              <p className="text-xs text-gray-900 truncate">
                {accountData
                  ? `${accountData.company_name} (#${accountData.account_number})`
                  : "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={closeRoom}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded font-medium"
            >
              Close
            </button>
            <button
              onClick={deleteRoom}
              className="text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded font-medium"
            >
              Delete
            </button>
          </div>
        </div>

        <MessageList messages={messages} currentUserType="agent" />

        <div className="border-t border-gray-200 p-3 flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Reply as master admin..."
              rows={1}
              disabled={room.status === "closed"}
              className="flex-1 resize-none px-3 py-2 border border-gray-900 rounded-lg text-gray-900 placeholder-gray-900 outline-none text-sm max-h-32"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending || room.status === "closed"}
              className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-lg disabled:opacity-50 flex-shrink-0"
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

      <div className="hidden lg:flex flex-col bg-white border border-gray-900 rounded-xl overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Master Info</h3>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div>
            <p className="text-xs text-gray-900 mb-1">Customer</p>
            <p className="text-gray-900">{room.customer_name}</p>
            <p className="text-xs text-gray-900">{room.customer_email || "—"}</p>
          </div>
          {accountData && (
            <div>
              <p className="text-xs text-gray-900 mb-1">Account</p>
              <p className="text-gray-900">{accountData.company_name}</p>
              <p className="text-xs text-gray-900 font-mono">
                #{accountData.account_number}
              </p>
              <Link
                href={`/master/accounts/${accountData.id}`}
                className="text-xs text-brand-600 hover:text-brand-700 mt-1 inline-block"
              >
                View account →
              </Link>
            </div>
          )}
          {room.visitor_page && (
            <div>
              <p className="text-xs text-gray-900 mb-1">Page</p>
              <p className="text-xs text-gray-900 break-all">
                {room.visitor_page}
              </p>
            </div>
          )}
          {room.visitor_country && (
            <div>
              <p className="text-xs text-gray-900 mb-1">Location</p>
              <p className="text-gray-900">
                {room.visitor_city ? `${room.visitor_city}, ` : ""}
                {room.visitor_country}
              </p>
            </div>
          )}
          {room.visitor_ip && (
            <div>
              <p className="text-xs text-gray-900 mb-1">IP</p>
              <p className="text-gray-900 font-mono text-xs">{room.visitor_ip}</p>
            </div>
          )}
          {room.pre_chat_data &&
            Object.keys(room.pre_chat_data).length > 0 && (
              <div>
                <p className="text-xs text-gray-900 mb-2">Pre-chat</p>
                <div className="space-y-1 bg-gray-50 rounded p-2 text-xs">
                  {Object.entries(room.pre_chat_data).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-gray-900">{k}:</span>{" "}
                      <span className="text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          <div>
            <p className="text-xs text-gray-900 mb-1">Created</p>
            <p className="text-xs text-gray-900">
              {new Date(room.created_at).toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}