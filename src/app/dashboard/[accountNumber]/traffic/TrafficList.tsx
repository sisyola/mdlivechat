"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Visitor } from "@/lib/types";

interface Props {
  accountId: string;
  accountNumber: string;
  initialVisitors: Visitor[];
}

const statusColors: Record<string, string> = {
  browsing: "bg-blue-100 text-blue-700",
  chatting: "bg-green-100 text-green-700",
  idle: "bg-yellow-100 text-yellow-700",
  offline: "bg-gray-100 text-gray-900",
};

export default function TrafficList({
  accountId,
  accountNumber,
  initialVisitors,
}: Props) {
  const [visitors, setVisitors] = useState<Visitor[]>(initialVisitors);
  const [filter, setFilter] = useState<"all" | "active">("active");
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`visitors-${accountId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitors",
          filter: `account_id=eq.${accountId}`,
        },
        () => {
          fetchVisitors();
        }
      )
      .subscribe();

    // Refresh every 30s (in case of idle/offline)
    const interval = setInterval(fetchVisitors, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  async function fetchVisitors() {
    const { data } = await supabase
      .from("visitors")
      .select("*")
      .eq("account_id", accountId)
      .order("last_seen_at", { ascending: false })
      .limit(50)
      .returns<Visitor[]>();
    if (data) setVisitors(data);
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  const filtered = visitors.filter((v) =>
    filter === "active" ? v.status !== "offline" : true
  );

  return (
    <div className="bg-white border border-gray-900 rounded-xl overflow-hidden">
      <div className="flex border-b border-gray-200 px-2">
        <button
          onClick={() => setFilter("active")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            filter === "active"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-900"
          }`}
        >
          Active
          <span className="ml-2 text-xs text-gray-900">
            ({visitors.filter((v) => v.status !== "offline").length})
          </span>
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            filter === "all"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-900"
          }`}
        >
          All
          <span className="ml-2 text-xs text-gray-900">({visitors.length})</span>
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M17.6 17.6a8 8 0 10-11.2 0M12 14v4"
                />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">
              Belum ada visitor
            </h3>
            <p className="text-sm text-gray-900 max-w-sm mx-auto">
              Visitor yang buka website dengan widget terpasang bakal muncul
              di sini secara real-time
            </p>
          </div>
        ) : (
          filtered.map((v) => (
            <div
              key={v.id}
              className="px-4 sm:px-6 py-4 hover:bg-gray-50 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {(v.name || "V").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="font-medium text-gray-900 truncate">
                    {v.name || `Visitor ${v.visitor_id.slice(-6)}`}
                  </p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      statusColors[v.status]
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
                <p className="text-sm text-gray-900 truncate">
                  {v.current_page
                    ? new URL(v.current_page).pathname
                    : v.email || "—"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-900">
                  {formatTime(v.last_seen_at)}
                </p>
                <p className="text-xs text-gray-900">{v.total_visits} visit</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}