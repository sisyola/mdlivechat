"use client";

import { useEffect, useRef, useState } from "react";
import type { Message, SenderType, MessageAttachment } from "@/lib/types";
import { formatFileSize } from "@/lib/utils/file-upload";
import { createClient } from "@/lib/supabase/client";

interface MessageListProps {
  messages: Message[];
  currentUserType: SenderType;
  currentUserId?: string;
  customerBubbleColor?: string;
  textColor?: string;
  showAdminActions?: boolean; // show edit/delete for agent messages
  onMessagesUpdate?: (msgs: Message[]) => void;
}

export default function MessageList({
  messages,
  currentUserType,
  customerBubbleColor = "#3b82f6",
  textColor = "#111827",
  showAdminActions = false,
  onMessagesUpdate,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-900 text-sm">
        Belum ada pesan. Mulai chat yuk!
      </div>
    );
  }

  const isImage = (type: string) => type.startsWith("image/");

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50"
    >
      {messages.map((msg) => {
        const isOwn = msg.sender_type === currentUserType;
        const isSystem = msg.sender_type === "system";

        if (isSystem) {
          return (
            <div key={msg.id} className="flex justify-center">
              <p className="text-xs text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                {msg.content}
              </p>
            </div>
          );
        }

        const hasAttachments = msg.attachments && msg.attachments.length > 0;
        const isAgentMessage = msg.sender_type === "agent";
        const canEdit = showAdminActions; // Admin can edit ANY message
        const canDelete = showAdminActions; // Admin can delete ANY message

        return (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={isOwn}
            hasAttachments={!!hasAttachments}
            isAgentMessage={isAgentMessage}
            canEdit={canEdit}
            canDelete={canDelete}
            customerBubbleColor={customerBubbleColor}
            textColor={textColor}
            isImageFn={isImage}
            onMessagesUpdate={onMessagesUpdate}
          />
        );
      })}
    </div>
  );
}

function MessageBubble({
  msg,
  isOwn,
  hasAttachments,
  isAgentMessage,
  canEdit,
  canDelete,
  customerBubbleColor,
  textColor,
  isImageFn,
  onMessagesUpdate,
}: {
  msg: Message;
  isOwn: boolean;
  hasAttachments: boolean;
  isAgentMessage: boolean;
  canEdit: boolean;
  canDelete: boolean;
  customerBubbleColor: string;
  textColor: string;
  isImageFn: (type: string) => boolean;
  onMessagesUpdate?: (msgs: Message[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);
  const [localContent, setLocalContent] = useState(msg.content);
  const [localEditedAt, setLocalEditedAt] = useState<string | null>(
    msg.edited_at
  );
  const [localDeleted, setLocalDeleted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const supabase = createClient();

  // Sync local state with incoming prop updates (from realtime)
  useEffect(() => {
    setLocalContent(msg.content);
    setLocalEditedAt(msg.edited_at);
    setLocalDeleted(false); // Reset delete state when new message arrives
  }, [msg.id, msg.content, msg.edited_at]);

  async function saveEdit() {
    const newContent = editText;
    const editedAt = new Date().toISOString();
    // Optimistic local update (instant)
    setLocalContent(newContent);
    setLocalEditedAt(editedAt);
    setEditing(false);
    // Persist to DB
    await supabase
      .from("messages")
      .update({ content: newContent, edited_at: editedAt })
      .eq("id", msg.id);
    // Force re-fetch messages to ensure consistency
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("livechat-refetch"));
    }, 100);
  }

  async function deleteMessage() {
    if (!confirm("Hapus message ini?")) return;
    // Optimistic local hide
    setLocalDeleted(true);
    // Persist to DB
    await supabase.from("messages").delete().eq("id", msg.id);
    // Force re-fetch after short delay
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("livechat-refetch"));
    }, 100);
  }

  if (localDeleted) return null;

  return (
    <div
      className={`flex group ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`relative max-w-[75%] rounded-2xl px-3 py-2 ${
          isOwn ? "rounded-tr-sm" : "rounded-tl-sm"
        } ${hasAttachments ? "p-2" : ""}`}
        style={{
          background: isOwn ? customerBubbleColor : "#f3f4f6",
          color: isOwn ? "#ffffff" : textColor,
        }}
      >
        {/* Admin action menu (only for agent messages when showAdminActions) */}
        {canEdit && (
          <div
            className={`absolute ${
              isOwn ? "-bottom-3 right-2" : "-top-3 left-2"
            } flex items-center gap-1 bg-white border border-gray-900 rounded-full shadow-md px-1 py-1 z-10 transition-opacity ${
              isOwn
                ? "opacity-0 group-hover:opacity-100"
                : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <button
              onClick={() => {
                setEditing(true);
                setShowMenu(false);
              }}
              className="p-1.5 hover:bg-blue-50 rounded-full text-gray-900 hover:text-blue-600"
              title="Edit message"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={deleteMessage}
              className="p-1.5 hover:bg-red-50 rounded-full text-gray-900 hover:text-red-600"
              title="Delete message"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Attachments */}
        {hasAttachments && (
          <div className="space-y-2 mb-1">
            {msg.attachments!.map((att, i) => (
              <AttachmentDisplay
                key={i}
                attachment={att}
                isOwn={isOwn}
                isImageFn={isImageFn}
              />
            ))}
          </div>
        )}

        {/* Edit mode or content */}
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="w-full px-2 py-1 text-sm border border-gray-900 rounded outline-none text-gray-900"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditText(msg.content);
                  setEditing(false);
                }}
                className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          localContent &&
          !localContent.startsWith("📎 ") && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {localContent}
            </p>
          )
        )}

        <p
          className={`text-[10px] mt-1 flex items-center gap-1 ${
            isOwn ? "text-blue-100 justify-end" : "text-gray-900"
          }`}
        >
          {new Date(msg.created_at).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {localEditedAt && (
            <span className="italic" title={`Edited ${new Date(msg.edited_at || msg.created_at).toLocaleString()}`}>
              · edited
            </span>
          )}
          {isOwn && (
            <span
              className={`ml-0.5 ${
                msg.read_at
                  ? "text-blue-500"
                  : isOwn
                  ? "text-blue-100"
                  : "text-gray-900"
              }`}
              title={msg.read_at ? "Read" : "Sent"}
            >
              {/* Double check icon (WhatsApp-style) */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="inline-block"
              >
                <path
                  d="M1 8.5L4 11.5L9 5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 8.5L9 11.5L14 5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function AttachmentDisplay({
  attachment,
  isOwn,
  isImageFn,
}: {
  attachment: MessageAttachment;
  isOwn: boolean;
  isImageFn: (type: string) => boolean;
}) {
  if (isImageFn(attachment.type)) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <img
          src={attachment.url}
          alt={attachment.name}
          className="rounded-lg max-w-full max-h-64 object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 p-2 rounded-lg ${
        isOwn ? "bg-white/20" : "bg-white"
      } hover:opacity-80 transition`}
    >
      <div className="w-10 h-10 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
        <span className="text-lg">📄</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          {attachment.name}
        </p>
        <p className={`text-[10px] ${isOwn ? "text-blue-100" : "text-gray-900"}`}>
          {attachment.type.split("/")[1]?.toUpperCase() || "File"} · {formatFileSize(attachment.size)}
        </p>
      </div>
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
    </a>
  );
}