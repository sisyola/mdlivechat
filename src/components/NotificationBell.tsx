"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationPreferences from "./NotificationPreferences";
import { useNotificationUnreadStore } from "@/lib/store/unread";
import { playNewMessageSound } from "@/lib/sounds";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: { room_id?: string } | null;
  read_at: string | null;
  created_at: string;
}

export default function NotificationBell({ accountId }: { accountId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const basePath = pathname.replace(/\/(inbox|traffic|automate|settings).*$/, "");

  // Use store for unread count (synced with sessionStorage)
  const { unreadCount, setUnreadCount, incrementUnread, initFromSession } = useNotificationUnreadStore();

  // Initialize from sessionStorage on mount
  useEffect(() => {
    initFromSession();
  }, [initFromSession]);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications-${accountId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `account_id=eq.${accountId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          incrementUnread();
          playNewMessageSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function fetchNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<Notification[]>();

    if (data) {
      setNotifications(data);
      // Set unread count from server data
      setUnreadCount(data.filter((n) => !n.read_at).length);
    }
  }

  async function markAsRead(id: string) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    // Decrement by 1 if this notification was unread
    const notif = notifications.find((n) => n.id === id);
    if (notif && !notif.read_at) {
      useNotificationUnreadStore.getState().decrementUnread(1);
    }
  }

  async function markAllAsRead() {
    const unread = notifications.filter((n) => !n.read_at);
    await Promise.all(
      unread.map((n) =>
        supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", n.id)
      )
    );
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    useNotificationUnreadStore.getState().resetUnread();
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          const willOpen = !open;
          setOpen(willOpen);
          // When opening dropdown, auto-mark all visible notifications as read
          // after 1.5s (so user has time to see them)
          if (willOpen && unreadCount > 0) {
            setTimeout(() => {
              void markAllAsRead();
            }, 1500);
          }
        }}
        className="relative p-2 text-gray-900 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        aria-label="Notifications"
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
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-900 rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 text-sm">
              {showSettings ? "Notification Settings" : "Notifications"}
            </h3>
            <div className="flex items-center gap-2">
              {showSettings ? (
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-xs text-gray-900 hover:text-gray-900"
                >
                  ← Back
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="text-xs text-gray-900 hover:text-gray-900"
                    title="Notification settings"
                  >
                    ⚙
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {showSettings ? (
            <NotificationPreferences onClose={() => setShowSettings(false)} />
          ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-gray-900">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p>Belum ada notifikasi</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={
                    n.data?.room_id
                      ? `${basePath}/inbox/${n.data.room_id}`
                      : "#"
                  }
                  onClick={() => {
                    if (!n.read_at) markAsRead(n.id);
                    setOpen(false);
                  }}
                  className={`block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 ${
                    !n.read_at ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        n.type === "new_message"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.395-3.72C3.512 15.042 3 13.574 3 12c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9c0 .552.448 1 1 1s1-.448 1-1-.448-1-1-1-1 .448-1 1zm5-1c-.552 0-1 .448-1 1s.448 1 1 1 1-.448 1-1-.448-1-1-1zM9 9c0 .552.448 1 1 1s1-.448 1-1-.448-1-1-1-1 .448-1 1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-900 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-gray-900 mt-1">
                        {formatTime(n.created_at)}
                      </p>
                    </div>
                    {!n.read_at && (
                      <div className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0 mt-2" />
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );
}