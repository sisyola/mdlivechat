"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatRoom, Message } from "@/lib/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useInboxUnreadStore } from "@/lib/store/unread";
import { playIncomingChatSound } from "@/lib/sounds";

interface InboxListProps {
  accountId: string;
  initialRooms: ChatRoom[];
}

interface RoomWithPreview extends ChatRoom {
  last_message_preview?: string;
  unread_count?: number;
}

export default function InboxList({ accountId, initialRooms }: InboxListProps) {
  const [rooms, setRooms] = useState<RoomWithPreview[]>(initialRooms);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("open");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  const basePath = pathname.replace(/\/inbox.*$/, "");
  const setUnreadCount = useInboxUnreadStore((state) => state.setUnreadCount);
  const initFromSession = useInboxUnreadStore((state) => state.initFromSession);

  // Initialize from sessionStorage on mount
  useEffect(() => {
    initFromSession();
  }, [initFromSession]);

  useEffect(() => {
    // Subscribe to room changes
    const roomChannel = supabase
      .channel(`account-rooms-${accountId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_rooms",
          filter: `account_id=eq.${accountId}`,
        },
        (payload) => {
          // Play sound on new chat (INSERT event)
          if (payload.eventType === "INSERT") {
            console.log("[Sound] New chat created, playing sound");
            playIncomingChatSound();
          }
          void fetchRooms();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchRooms();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          // When read_at is updated (admin read), refresh counts
          const updated = payload.new as { read_at?: string };
          if (updated?.read_at) {
            void fetchRooms();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // Fetch rooms on mount to sync with server
  useEffect(() => {
    void fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for inbox-refresh event (triggered when admin reads messages)
  useEffect(() => {
    const handler = () => void fetchRooms();
    window.addEventListener("inbox-refresh", handler);
    return () => window.removeEventListener("inbox-refresh", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRooms() {
    const { data } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("account_id", accountId)
      .order("last_message_at", { ascending: false })
      .limit(50)
      .returns<ChatRoom[]>();

    if (!data) return;
    // Get last message + unread count for each
    const withPreview = await Promise.all(
      data.map(async (room) => {
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, sender_type")
          .eq("room_id", room.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<Message>();

        // Count unread customer messages (messages from customer that admin hasn't read)
        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .eq("sender_type", "customer")
          .is("read_at", null);

        return {
          ...room,
          last_message_preview: lastMsg?.content || "Belum ada pesan",
          unread_count: unreadCount || 0,
        };
      })
    );
    setRooms(withPreview);

    // Sync total unread count to global store
    const totalUnread = withPreview.reduce((sum, r) => sum + (r.unread_count || 0), 0);
    setUnreadCount(totalUnread);
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return "Baru";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}j`;
    if (diffDay < 7) return `${diffDay}h`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  const filteredRooms = rooms.filter((r) =>
    filter === "all" ? true : r.status === filter
  );

  function toggleSelect(roomId: string) {
    const next = new Set(selected);
    if (next.has(roomId)) next.delete(roomId);
    else next.add(roomId);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === filteredRooms.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRooms.map((r) => r.id)));
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Hapus ${selected.size} chat room PERMANEN? Semua messages juga ikut terhapus.`
      )
    )
      return;
    setDeleting(true);
    // Delete messages first (FK constraint)
    const ids = Array.from(selected);
    await supabase.from("messages").delete().in("room_id", ids);
    // Then delete rooms
    await supabase.from("chat_rooms").delete().in("id", ids);
    // Update local state
    setRooms((prev) => prev.filter((r) => !selected.has(r.id)));
    exitSelectMode();
    setDeleting(false);
    router.refresh();
  }

  const tabs = [
    { value: "open" as const, label: "Open" },
    { value: "closed" as const, label: "Closed" },
    { value: "all" as const, label: "All" },
  ];

  return (
    <div className="bg-white border border-gray-900 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-900 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              filter === tab.value
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-900 hover:text-gray-900"
            }`}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span className="ml-2 text-xs text-gray-900">
                ({rooms.filter((r) => r.status === tab.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk action toolbar */}
      {selectMode && (
        <div className="bg-brand-50 border-b border-brand-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={exitSelectMode}
              className="text-sm text-gray-900 hover:text-gray-900"
            >
              Cancel
            </button>
            <span className="text-sm font-medium text-gray-900">
              {selected.size} dipilih
            </span>
          </div>
          <button
            onClick={bulkDelete}
            disabled={selected.size === 0 || deleting}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-md font-medium disabled:opacity-50"
          >
            {deleting ? "Menghapus..." : "🗑 Hapus"}
          </button>
        </div>
      )}

      {/* Room list */}
      <div className="divide-y divide-gray-100 max-h-[calc(100vh-20rem)] overflow-y-auto">
        {filteredRooms.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">
              Belum ada chat
            </h3>
            <p className="text-sm text-gray-900">
              Customer chat akan muncul di sini. Embed widget di website lu buat
              mulai terima chat.
            </p>
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div
              key={room.id}
              className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-gray-50 transition ${
                selected.has(room.id) ? "bg-brand-50" : ""
              }`}
            >
              {/* Checkbox (only in select mode) */}
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selected.has(room.id)}
                  onChange={() => toggleSelect(room.id)}
                  className="w-4 h-4 rounded flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
              )}

              {/* Avatar */}
              <button
                onClick={() => {
                  if (selectMode) toggleSelect(room.id);
                }}
                className="relative w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-semibold flex-shrink-0"
              >
                {room.customer_name.charAt(0).toUpperCase()}
                {/* Unread badge */}
                {room.unread_count && room.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5 ring-2 ring-white">
                    {room.unread_count > 9 ? "9+" : room.unread_count}
                  </span>
                )}
              </button>

              {/* Chat info */}
              {selectMode ? (
                <button
                  onClick={() => toggleSelect(room.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex justify-between items-baseline gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {room.customer_name}
                    </h3>
                    <span className="text-xs text-gray-900 flex-shrink-0">
                      {formatTime(room.last_message_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 truncate mt-1">
                    {room.last_message_preview}
                  </p>
                </button>
              ) : (
                <Link
                  href={`${basePath}/inbox/${room.id}`}
                  className="flex-1 min-w-0"
                >
                  <div className="flex justify-between items-baseline gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {room.customer_name}
                    </h3>
                    <span className="text-xs text-gray-900 flex-shrink-0">
                      {formatTime(room.last_message_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2 mt-1">
                    <p className="text-sm text-gray-900 truncate">
                      {room.last_message_preview}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                        room.status === "open"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {room.status === "open" ? "Open" : "Closed"}
                    </span>
                  </div>
                </Link>
              )}

              {/* Select button (only show in normal mode) */}
              {!selectMode && (
                <button
                  onClick={() => {
                    setSelectMode(true);
                    setSelected(new Set([room.id]));
                  }}
                  className="p-2 hover:bg-gray-100 rounded text-gray-900 hover:text-gray-900 flex-shrink-0"
                  title="Select multiple"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}