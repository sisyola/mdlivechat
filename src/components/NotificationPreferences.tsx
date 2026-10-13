"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "livechat_notification_prefs";

export interface NotificationPrefs {
  enabled: boolean; // Browser notifications
  sound: boolean;
  repeatUntilRead: boolean;
  notifyNewMessage: boolean;
  notifyNewChat: boolean;
  notifyNewVisitor: boolean;
  notifyReturningVisitor: boolean;
}

const defaultPrefs: NotificationPrefs = {
  enabled: false,
  sound: true,
  repeatUntilRead: true,
  notifyNewMessage: true,
  notifyNewChat: true,
  notifyNewVisitor: true,
  notifyReturningVisitor: false,
};

export function getNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultPrefs, ...JSON.parse(stored) };
  } catch {}
  return defaultPrefs;
}

export function saveNotificationPrefs(prefs: NotificationPrefs) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }
}

export async function requestBrowserPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showBrowserNotification(title: string, options?: NotificationOptions) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });
  } catch {}
}

interface Props {
  onClose?: () => void;
}

export default function NotificationPreferences({ onClose }: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | "unknown"
  >("unknown");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefs(getNotificationPrefs());
    if ("Notification" in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  async function handleSave() {
    saveNotificationPrefs(prefs);
    if (prefs.enabled && browserPermission !== "granted") {
      const granted = await requestBrowserPermission();
      setBrowserPermission(granted ? "granted" : "denied");
      if (!granted) {
        alert("Browser notification permission denied. Enable it di browser settings.");
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (onClose) onClose();
  }

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <div className="bg-white border border-gray-900 rounded-xl p-5 max-w-md">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Notification Preferences
      </h2>

      {browserPermission === "denied" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex gap-2 text-sm">
          <svg
            className="w-5 h-5 text-yellow-600 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-yellow-900">
            Enable browser notifications supaya ga miss chat.
          </p>
        </div>
      )}

      {browserPermission !== "granted" && (
        <button
          onClick={async () => {
            const granted = await requestBrowserPermission();
            setBrowserPermission(granted ? "granted" : "denied");
            if (granted) {
              setPrefs((p) => ({ ...p, enabled: true }));
            }
          }}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-lg mb-4"
        >
          Enable browser notifications
        </button>
      )}

      <div className="space-y-3">
        <div className="border-t border-gray-200 pt-3">
          <label className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-900"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.895-4.21-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900">
                Notification sound
              </span>
            </div>
            <input
              type="checkbox"
              checked={prefs.sound}
              onChange={() => toggle("sound")}
              className="w-4 h-4"
            />
          </label>
          {prefs.sound && (
            <label className="flex items-center gap-2 mt-2 ml-7 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={prefs.repeatUntilRead}
                onChange={() => toggle("repeatUntilRead")}
                className="w-3 h-3"
              />
              Repeat sound until message is read
            </label>
          )}
        </div>

        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs text-gray-900 uppercase mb-2 font-medium">
            Notify me about
          </p>
          <div className="space-y-2">
            {[
              { key: "notifyNewMessage" as const, label: "New messages" },
              { key: "notifyNewChat" as const, label: "Incoming chats" },
              { key: "notifyNewVisitor" as const, label: "New visitors" },
              { key: "notifyReturningVisitor" as const, label: "Returning visitors" },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between">
                <span className="text-sm text-gray-900">{item.label}</span>
                <input
                  type="checkbox"
                  checked={prefs[item.key]}
                  onChange={() => toggle(item.key)}
                  className="w-4 h-4"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full mt-5 bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-lg transition"
      >
        {saved ? "✓ Saved" : "Save"}
      </button>
    </div>
  );
}