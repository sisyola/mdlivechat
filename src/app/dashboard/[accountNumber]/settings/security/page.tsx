"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import SettingsLayout from "../SettingsLayout";
import { sendLoginAlert } from "@/lib/discord-webhook";

export default function SecuritySettingsPage() {
  const params = useParams();
  const accountNumber = params.accountNumber as string;
  const [accountId, setAccountId] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadAccountAndSettings();
  }, []);

  async function loadAccountAndSettings() {
    console.log("[SecuritySettings] Starting load...");

    // First get the account UUID from account number
    const { data: accountData, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("account_number", accountNumber)
      .single();

    console.log("[SecuritySettings] Account lookup:", accountData, accountError);

    if (!accountData) {
      console.log("[SecuritySettings] No account found for:", accountNumber);
      return;
    }

    setAccountId(accountData.id);

    // Then get the settings
    const { data, error: settingsError } = await supabase
      .from("account_settings")
      .select("discord_webhook_url, discord_alert_enabled")
      .eq("account_id", accountData.id)
      .single();

    console.log("[SecuritySettings] Settings lookup:", data, settingsError);

    if (data) {
      setWebhookUrl(data.discord_webhook_url || "");
      setEnabled(data.discord_alert_enabled || false);
    }
  }

  async function saveSettings() {
    if (!accountId) {
      console.log("[SecuritySettings] No accountId, cannot save");
      return;
    }
    setSaving(true);

    console.log("[SecuritySettings] Saving with accountId:", accountId);

    // Use upsert to handle both insert and update
    const { error } = await supabase
      .from("account_settings")
      .upsert({
        account_id: accountId,
        discord_webhook_url: webhookUrl,
        discord_alert_enabled: enabled,
      }, {
        onConflict: 'account_id'
      });

    console.log("[SecuritySettings] Upsert error:", error);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function testWebhook() {
    if (!webhookUrl) return;
    setTesting(true);
    setTestResult(null);

    const success = await sendLoginAlert(webhookUrl, {
      email: "test@example.com",
      name: "Test User",
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
    // First save
    await saveSettings();
    // Then test
    setTimeout(() => {
      if (webhookUrl) {
        testWebhook();
      }
    }, 500);
  }

  return (
    <SettingsLayout accountNumber={accountNumber}>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Security Settings</h1>
        <p className="text-gray-500 mb-6">
          Atur notifikasi keamanan login ke Discord
        </p>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
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
                  Kirim notifikasi ke Discord setiap ada login baru
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
              Buat webhook di Discord channel settings &gt; Integrations &gt; Webhooks
            </p>
          </div>

          {/* Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">📋 Data yang dikirim:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Foto dari kamera depan (webcam)</li>
              <li>• Timestamp (tanggal, jam, timezone)</li>
              <li>• Alamat IP & lokasi</li>
              <li>• Device info (HP/Desktop)</li>
              <li>• Browser & OS</li>
              <li>• Screen resolution</li>
            </ul>
          </div>

          {/* Test Button */}
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
              disabled={saving || !accountId}
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {saving ? "Saving..." : saved ? "✓ Saved!" : "Save & Test"}
            </button>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
