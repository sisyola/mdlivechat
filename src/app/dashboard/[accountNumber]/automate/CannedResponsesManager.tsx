"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { CannedResponse, CannedResponseScope } from "@/lib/types";
import FileUpload from "@/components/FileUpload";
import { formatFileSize } from "@/lib/utils/file-upload";

interface Props {
  accountId: string;
  initialResponses: CannedResponse[];
}

export default function CannedResponsesManager({
  accountId,
  initialResponses,
}: Props) {
  const [responses, setResponses] = useState<CannedResponse[]>(
    initialResponses || []
  );
  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function newResponse() {
    setEditing({
      id: `c_${Date.now().toString(36)}`,
      shortcut: "",
      text: "",
      scope: "shared",
    });
    setIsNew(true);
  }

  function startEdit(c: CannedResponse) {
    setEditing({ ...c });
    setIsNew(false);
  }

  async function save() {
    if (!editing) return;
    if (!editing.shortcut.trim() || !editing.text.trim()) {
      alert("Shortcut dan text harus diisi");
      return;
    }
    setSaving(true);
    const next = isNew
      ? [...responses, editing]
      : responses.map((r) => (r.id === editing.id ? editing : r));
    const { error } = await supabase
      .from("account_settings")
      .update({ canned_responses: next })
      .eq("account_id", accountId);
    if (!error) {
      setResponses(next);
      setEditing(null);
      setIsNew(false);
      router.refresh();
    } else {
      alert("Gagal save: " + error.message);
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Hapus response ini?")) return;
    const next = responses.filter((r) => r.id !== id);
    const { error } = await supabase
      .from("account_settings")
      .update({ canned_responses: next })
      .eq("account_id", accountId);
    if (!error) {
      setResponses(next);
      router.refresh();
    }
  }

  const filtered = responses.filter((r) =>
    filter
      ? r.shortcut.toLowerCase().includes(filter.toLowerCase()) ||
        r.text.toLowerCase().includes(filter.toLowerCase())
      : true
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automate</h1>
          <p className="text-gray-900 mt-1">
            Canned responses — ketik #shortcut di chat untuk pakai
          </p>
        </div>
        <button
          onClick={newResponse}
          className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-2 rounded-lg transition"
        >
          + New response
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* List */}
        <div className="bg-white border border-gray-900 rounded-xl">
          <div className="p-4 border-b border-gray-200">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Cari response..."
              className="w-full px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 outline-none placeholder-gray-900"
            />
          </div>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-gray-900">
                Belum ada canned response
              </div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  className="px-4 py-3 hover:bg-gray-50 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-brand-600 font-semibold">
                        #{c.shortcut}
                      </code>
                      {c.scope === "private" && (
                        <span className="text-xs bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded">
                          Private
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 mt-0.5 truncate">
                      {c.text}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(c)}
                      className="text-xs text-gray-900 hover:text-gray-900 px-2 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="bg-white border border-gray-900 rounded-xl p-5">
          {!editing ? (
            <div className="text-center py-12">
              <p className="text-gray-900 text-sm">
                Klik "+ New response" atau pilih response di kiri untuk edit
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-900">
                {isNew ? "New response" : "Edit response"}
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Shortcut
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-900">#</span>
                  <input
                    type="text"
                    value={editing.shortcut}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        shortcut: e.target.value.toLowerCase().replace(/\s/g, ""),
                      })
                    }
                    placeholder="hi"
                    className="flex-1 px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 outline-none font-mono placeholder-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Response text
                </label>
                <textarea
                  value={editing.text}
                  onChange={(e) =>
                    setEditing({ ...editing, text: e.target.value })
                  }
                  rows={6}
                  placeholder="Halo! Ada yang bisa saya bantu?"
                  className="w-full px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 outline-none placeholder-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Attachment (optional)
                </label>
                {editing.attachment_url ? (
                  <div className="flex items-center gap-3 p-2 border border-gray-900 rounded-lg">
                    {editing.attachment_type?.startsWith("image/") && (
                      <img
                        src={editing.attachment_url}
                        alt={editing.attachment_name || ""}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {editing.attachment_name}
                      </p>
                      <p className="text-xs text-gray-900">
                        {editing.attachment_size && formatFileSize(editing.attachment_size)}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setEditing({
                          ...editing,
                          attachment_url: undefined,
                          attachment_type: undefined,
                          attachment_name: undefined,
                          attachment_size: undefined,
                        })
                      }
                      className="text-red-600 text-sm hover:text-red-700"
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <FileUpload
                    bucket="attachments"
                    path={`canned/${accountId}`}
                    accept="image/*,application/pdf"
                    onUpload={(url, file) =>
                      setEditing({
                        ...editing,
                        attachment_url: url,
                        attachment_type: file.type,
                        attachment_name: file.name,
                        attachment_size: file.size,
                      })
                    }
                  >
                    {({ onClick, uploading }) => (
                      <button
                        type="button"
                        onClick={onClick}
                        disabled={uploading}
                        className="w-full px-3 py-2 border border-dashed border-gray-900 rounded-lg text-sm text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {uploading ? "Uploading..." : "📎 Upload file/image"}
                      </button>
                    )}
                  </FileUpload>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Scope
                </label>
                <select
                  value={editing.scope}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      scope: e.target.value as CannedResponseScope,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-900 rounded-lg text-sm text-gray-900 outline-none"
                >
                  <option value="shared">Shared (semua agent)</option>
                  <option value="private">Private (cuma lu)</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditing(null);
                    setIsNew(false);
                  }}
                  className="px-4 py-2 border border-gray-900 rounded-lg text-gray-900 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}