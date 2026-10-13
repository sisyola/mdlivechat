"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { ChatRoom, Message, MessageAttachment } from "@/lib/types";

interface ChatAdminActionsProps {
  room: ChatRoom;
  onRoomUpdate: (room: ChatRoom) => void;
  onClearMessages: () => void;
}

export default function ChatAdminActions({
  room,
  onRoomUpdate,
  onClearMessages,
}: ChatAdminActionsProps) {
  const [open, setOpen] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function toggleStatus() {
    const newStatus = room.status === "open" ? "closed" : "open";
    await supabase
      .from("chat_rooms")
      .update({ status: newStatus })
      .eq("id", room.id);
    onRoomUpdate({ ...room, status: newStatus });
  }

  async function banCustomer() {
    if (!confirm(`Banned ${room.customer_name}? Mereka ga bakal bisa chat lagi.`)) return;
    setLoading(true);
    await supabase
      .from("chat_rooms")
      .update({
        is_banned: true,
        banned_reason: banReason || "No reason provided",
        banned_at: new Date().toISOString(),
        status: "closed",
      })
      .eq("id", room.id);
    onRoomUpdate({
      ...room,
      is_banned: true,
      banned_reason: banReason,
      banned_at: new Date().toISOString(),
      status: "closed",
    });
    setShowBanDialog(false);
    setBanReason("");
    setLoading(false);
    alert(`${room.customer_name} udah di-ban dari chat ini.`);
  }

  async function unbanCustomer() {
    await supabase
      .from("chat_rooms")
      .update({
        is_banned: false,
        banned_reason: null,
        banned_at: null,
      })
      .eq("id", room.id);
    onRoomUpdate({ ...room, is_banned: false, banned_reason: null });
  }

  async function clearChat() {
    if (
      !confirm(
        "Hapus semua messages di chat ini? Action ini ga bisa di-undo."
      )
    )
      return;
    setLoading(true);
    await supabase.from("messages").delete().eq("room_id", room.id);
    onClearMessages();
    setLoading(false);
    alert("Chat cleared!");
  }

  async function deleteRoom() {
    if (
      !confirm(
        "Hapus PERMANEN chat ini + semua messages? Action ini ga bisa di-undo."
      )
    )
      return;
    await supabase.from("chat_rooms").delete().eq("id", room.id);
    router.push("/dashboard");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium flex items-center gap-1 text-gray-900"
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
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
        Actions
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-900 rounded-lg shadow-lg z-30 overflow-hidden">
            <button
              onClick={toggleStatus}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-900"
            >
              {room.status === "open" ? "🔒 Close chat" : "▶ Reopen chat"}
            </button>

            {!room.is_banned ? (
              <button
                onClick={() => {
                  setOpen(false);
                  setShowBanDialog(true);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-900"
              >
                🚫 Ban customer
              </button>
            ) : (
              <button
                onClick={unbanCustomer}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-900"
              >
                ✓ Unban customer
              </button>
            )}

            <div className="border-t border-gray-200" />

            <button
              onClick={() => {
                setOpen(false);
                clearChat();
              }}
              disabled={loading}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-900 disabled:opacity-50"
            >
              🗑 Clear all messages
            </button>

            <button
              onClick={() => {
                setOpen(false);
                deleteRoom();
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
            >
              ❌ Delete chat permanently
            </button>
          </div>
        </>
      )}

      {showBanDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-bold mb-2">Ban {room.customer_name}?</h2>
            <p className="text-sm text-gray-900 mb-4">
              Customer ini ga bakal bisa kirim pesan lagi di chat ini. Tapi
              history chat tetep tersimpan.
            </p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Alasan ban (opsional)..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 mb-4 outline-none placeholder-gray-900"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowBanDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-900 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={banCustomer}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
              >
                Ban customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}