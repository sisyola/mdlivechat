"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { AccountSettings, PreChatField } from "@/lib/types";

interface Props {
  accountId: string;
  settings: AccountSettings;
}

const fieldTypes: { value: PreChatField["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "textarea", label: "Textarea" },
  { value: "select", label: "Select" },
];

export default function PreChatBuilder({ accountId, settings }: Props) {
  const [enabled, setEnabled] = useState(settings.pre_chat_enabled);
  const [message, setMessage] = useState(settings.pre_chat_message);
  const [fields, setFields] = useState<PreChatField[]>(
    settings.pre_chat_fields
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function addField() {
    setFields([
      ...fields,
      { label: "New Field", type: "text", required: false },
    ]);
  }

  function updateField(idx: number, patch: Partial<PreChatField>) {
    const next = [...fields];
    next[idx] = { ...next[idx], ...patch };
    setFields(next);
  }

  function removeField(idx: number) {
    setFields(fields.filter((_, i) => i !== idx));
  }

  function moveField(idx: number, dir: -1 | 1) {
    const next = [...fields];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setFields(next);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("account_settings")
      .update({
        pre_chat_enabled: enabled,
        pre_chat_message: message,
        pre_chat_fields: fields,
      })
      .eq("account_id", accountId);

    if (!error) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert("Gagal save: " + error.message);
    }
    setSaving(false);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Pre-chat Form</h1>
        <p className="text-gray-900 mb-6">
          Kumpulkan info customer sebelum chat dimulai
        </p>

        <div className="space-y-5 bg-white border border-gray-900 rounded-xl p-6">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-900">
              Aktifkan pre-chat form
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-900 rounded-lg outline-none text-sm text-gray-900 placeholder-gray-900"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-gray-900">Fields</label>
              <button
                onClick={addField}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                + Add field
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div
                  key={idx}
                  className="border border-gray-900 rounded-lg p-3 space-y-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) =>
                        updateField(idx, { label: e.target.value })
                      }
                      placeholder="Field label"
                      className="flex-1 px-3 py-2 border border-gray-900 rounded text-sm text-gray-900 outline-none placeholder-gray-900"
                    />
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(idx, {
                          type: e.target.value as PreChatField["type"],
                        })
                      }
                      className="px-2 py-2 border border-gray-900 rounded text-sm text-gray-900"
                    >
                      {fieldTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          updateField(idx, { required: e.target.checked })
                        }
                      />
                      Required
                    </label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveField(idx, -1)}
                        disabled={idx === 0}
                        className="px-2 py-1 text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveField(idx, 1)}
                        disabled={idx === fields.length - 1}
                        className="px-2 py-1 text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeField(idx)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-2">Preview</h2>
        <div className="bg-white border border-gray-900 rounded-xl p-5">
          {!enabled ? (
            <p className="text-sm text-gray-900 italic">
              Pre-chat form nonaktif. Customer langsung ke chat.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-900 mb-4">{message}</p>
              <div className="space-y-3">
                {fields.map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-medium text-gray-900 mb-1">
                      {field.label}
                      {field.required && " *"}
                    </label>
                    {field.type === "textarea" ? (
                      <div className="w-full px-3 py-2 border border-gray-900 rounded text-sm bg-gray-50">
                        Textarea
                      </div>
                    ) : field.type === "select" ? (
                      <div className="w-full px-3 py-2 border border-gray-900 rounded text-sm bg-gray-50">
                        Select...
                      </div>
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-900 rounded text-sm bg-gray-50">
                        {field.type}
                      </div>
                    )}
                  </div>
                ))}
                <div className="w-full bg-brand-600 text-white text-center py-2 rounded text-sm">
                  Mulai Chat
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}