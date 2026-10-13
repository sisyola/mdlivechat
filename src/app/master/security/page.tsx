"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendLoginAlert } from "@/lib/discord-webhook";
import { useRouter } from "next/navigation";

export default function MasterSecuritySettingsPage() {
  const router = useRouter();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [captureWebcam, setCaptureWebcam] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data } = await supabase
      .from("global_security_settings")
      .select("*")
      .single();

    if (data) {
      setWebhookUrl(data.discord_webhook_url || "");
      setEnabled(data.discord_alert_enabled || false);
      setCaptureWebcam(data.capture_webcam ?? true);
    }
  }

  async function saveSettings() {
    setSaving(true);

    // Upsert global settings
    const { error } = await supabase
      .from("global_security_settings")
      .upsert({
        discord_webhook_url: webhookUrl,
        discord_alert_enabled: enabled,
        capture_webcam: captureWebcam,
      });

    console.log("[Security] Save error:", error);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function testWebhook() {
    if (!webhookUrl) return;
    setTesting(true);
    setTestResult(null);

    const success = await sendLoginAlert(webhookUrl, {
      email: "test@master-admin.com",
      name: "Test Admin",
      ipAddress: "127.0.0.1",
      location: "Test Location",
      device: "Desktop",
      browser: "Chrome",
      os: "Windows",
      screen: "1920x1080",
      timestamp: new Date().toLocaleString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      }),
    });

    setTesting(false);
    setTestResult(success ? "success" : "error");
  }

  async function saveAndTest() {
    await saveSettings();
    setTimeout(() => {
      if (webhookUrl) testWebhook();
    }, 500);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Security Settings</h1>
        <p className="text-gray-500">
          Atur notifikasi login webcam capture ke Discord untuk semua user
        </p>
      </div>

      <div className="bg-white border border-gray-900 rounded-xl p-6 space-y-6">
        {/* Enable Toggle */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-brand-600"
            />
            <div>
              <span className="font-medium text-gray-900">Enable Login Alerts</span>
              <p className="text-sm text-gray-500">
                Kirim notifikasi ke Discord setiap ada user login
              </p>
            </div>
          </label>
        </div>

        {/* Webcam Toggle */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={captureWebcam}
              onChange={(e) => setCaptureWebcam(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-brand-600"
            />
            <div>
              <span className="font-medium text-gray-900">Capture Webcam Photo</span>
              <p className="text-sm text-gray-500">
                Ambil foto dari kamera depan saat login
              </p>
            </div>
          </label>
        </div>

        {/* Webhook URL */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Discord Webhook URL
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/xxx/xxx"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Buat webhook di Discord channel &gt; Settings &gt; Integrations &gt; Webhooks
          </p>
        </div>

        {/* Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">📋 Data yang dikirim ke Discord:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Foto dari kamera depan (webcam)</li>
            <li>• Timestamp (tanggal, jam, timezone)</li>
            <li>• Alamat IP & lokasi</li>
            <li>• Device info (HP/Desktop)</li>
            <li>• Browser & OS</li>
            <li>• Screen resolution</li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={testWebhook}
            disabled={testing || !webhookUrl}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {testing ? "Sending..." : testResult === "success" ? "✓ Sent!" : testResult === "error" ? "✗ Failed" : "Test Webhook"}
          </button>
          <button
            onClick={saveAndTest}
            disabled={saving}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "✓ Saved!" : "Save & Test"}
          </button>
        </div>
      </div>
    </div>
  );
}
