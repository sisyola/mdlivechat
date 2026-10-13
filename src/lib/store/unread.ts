import { create } from "zustand";

// Helper to get from sessionStorage (client-side only)
function getSessionValue(key: string): number {
  if (typeof window === "undefined") return 0;
  const stored = sessionStorage.getItem(key);
  return stored ? parseInt(stored, 10) : 0;
}

function setSessionValue(key: string, value: number) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, value.toString());
}

// Store for notification bell unread count
interface NotificationUnreadState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: (amount?: number) => void;
  resetUnread: () => void;
  initFromSession: () => void;
}

const NOTIF_KEY = "livechat_notif_unread";

export const useNotificationUnreadStore = create<NotificationUnreadState>((set, get) => ({
  unreadCount: 0,
  setUnreadCount: (count: number) => {
    set({ unreadCount: count });
    setSessionValue(NOTIF_KEY, count);
  },
  incrementUnread: () => {
    const newCount = get().unreadCount + 1;
    set({ unreadCount: newCount });
    setSessionValue(NOTIF_KEY, newCount);
  },
  decrementUnread: (amount = 1) => {
    const newCount = Math.max(0, get().unreadCount - amount);
    set({ unreadCount: newCount });
    setSessionValue(NOTIF_KEY, newCount);
  },
  resetUnread: () => {
    set({ unreadCount: 0 });
    setSessionValue(NOTIF_KEY, 0);
  },
  initFromSession: () => {
    const stored = getSessionValue(NOTIF_KEY);
    set({ unreadCount: stored });
  },
}));

// Store for inbox total unread message count
interface InboxUnreadState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: (amount?: number) => void;
  resetUnread: () => void;
  initFromSession: () => void;
}

const INBOX_KEY = "livechat_inbox_unread";

export const useInboxUnreadStore = create<InboxUnreadState>((set, get) => ({
  unreadCount: 0,
  setUnreadCount: (count: number) => {
    set({ unreadCount: count });
    setSessionValue(INBOX_KEY, count);
  },
  incrementUnread: () => {
    const newCount = get().unreadCount + 1;
    set({ unreadCount: newCount });
    setSessionValue(INBOX_KEY, newCount);
  },
  decrementUnread: (amount = 1) => {
    const newCount = Math.max(0, get().unreadCount - amount);
    set({ unreadCount: newCount });
    setSessionValue(INBOX_KEY, newCount);
  },
  resetUnread: () => {
    set({ unreadCount: 0 });
    setSessionValue(INBOX_KEY, 0);
  },
  initFromSession: () => {
    const stored = getSessionValue(INBOX_KEY);
    set({ unreadCount: stored });
  },
}));
