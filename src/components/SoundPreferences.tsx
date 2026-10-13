"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SoundOption {
  id: string;
  name: string;
  description: string;
  frequencies: number[];
  duration: number;
}

const SOUND_OPTIONS: SoundOption[] = [
  {
    id: "chime",
    name: "Chime",
    description: "Lofi chiming bell",
    frequencies: [523, 659, 784, 1047],
    duration: 0.6,
  },
  {
    id: "ding",
    name: "Ding Dong",
    description: "Classic doorbell",
    frequencies: [440, 0, 330],
    duration: 0.5,
  },
  {
    id: "pop",
    name: "Pop",
    description: "Soft bubble pop",
    frequencies: [800, 400],
    duration: 0.2,
  },
  {
    id: "bell",
    name: "Bell",
    description: "Notification bell",
    frequencies: [880, 1100, 880],
    duration: 0.4,
  },
  {
    id: "ascending",
    name: "Ascending",
    description: "Rising tone",
    frequencies: [440, 554, 659, 784],
    duration: 0.5,
  },
  {
    id: "double",
    name: "Double Beep",
    description: "Two quick beeps",
    frequencies: [880, 0, 880],
    duration: 0.3,
  },
];

interface SoundPreferencesProps {
  accountId: string;
  onClose: () => void;
}

export default function SoundPreferences({ accountId, onClose }: SoundPreferencesProps) {
  const [selectedChat, setSelectedChat] = useState("chime");
  const [selectedMessage, setSelectedMessage] = useState("double");
  const [volume, setVolume] = useState(70);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  function playSound(option: SoundOption) {
    const win = window as unknown as { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext || win.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const vol = (volume / 100) * 0.5;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + option.duration);

    // Handle pause (0 frequency)
    const step = option.duration / option.frequencies.length;
    option.frequencies.forEach((freq, i) => {
      if (freq > 0) {
        osc.frequency.setValueAtTime(freq, ctx.currentTime + step * i);
      }
    });

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + option.duration);
  }

  async function savePreferences() {
    setSaving(true);

    // Save to localStorage for quick access
    localStorage.setItem("sound_preferences", JSON.stringify({
      chatSound: selectedChat,
      messageSound: selectedMessage,
      volume,
      enabled,
    }));

    // Also save to user preferences in database if exists
    await supabase.from("user_preferences").upsert({
      user_id: accountId,
      key: "sound_preferences",
      value: JSON.stringify({
        chatSound: selectedChat,
        messageSound: selectedMessage,
        volume,
        enabled,
      }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Notification Sounds</h4>

        {/* Enable/Disable */}
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-gray-900"
          />
          <span className="text-sm text-gray-900">Enable notification sounds</span>
        </label>

        {/* Volume */}
        <div className="mb-4">
          <label className="text-sm text-gray-900 mb-2 block">
            Volume: {volume}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* New Chat Sound */}
      <div>
        <label className="text-sm font-medium text-gray-900 mb-2 block">
          New Chat Sound
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SOUND_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setSelectedChat(option.id);
                playSound(option);
              }}
              className={`p-3 rounded-lg border text-left transition ${
                selectedChat === option.id
                  ? "border-brand-600 bg-brand-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-sm font-medium text-gray-900">{option.name}</div>
              <div className="text-xs text-gray-500">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* New Message Sound */}
      <div>
        <label className="text-sm font-medium text-gray-900 mb-2 block">
          New Message Sound
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SOUND_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setSelectedMessage(option.id);
                playSound(option);
              }}
              className={`p-3 rounded-lg border text-left transition ${
                selectedMessage === option.id
                  ? "border-brand-600 bg-brand-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-sm font-medium text-gray-900">{option.name}</div>
              <div className="text-xs text-gray-500">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={savePreferences}
        disabled={saving}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Preferences"}
      </button>
    </div>
  );
}
