import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function MasterChatsPage() {
  const supabase = await createClient();

  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select("*, accounts(company_name, account_number, status)")
    .order("last_message_at", { ascending: false })
    .limit(100);

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return "Baru";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}j`;
    if (diffDay < 7) return `${diffDay}h`;
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">All Chats</h1>
      <p className="text-gray-900 mb-6">
        Semua chat dari semua akun ({rooms?.length || 0})
      </p>

      <div className="bg-white border border-gray-900 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-900 uppercase">
                Customer
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-900 uppercase">
                Account
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-900 uppercase">
                Status
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-900 uppercase">
                Last Activity
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-900 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rooms || rooms.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-gray-900">
                  Belum ada chat
                </td>
              </tr>
            ) : (
              rooms.map((room) => {
                const account = Array.isArray(room.accounts)
                  ? room.accounts[0]
                  : room.accounts;
                return (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-semibold text-xs">
                          {room.customer_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">
                          {room.customer_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {account && (
                        <div>
                          <p className="text-gray-900">
                            {account.company_name}
                          </p>
                          <p className="text-xs text-gray-900 font-mono">
                            #{account.account_number}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          room.status === "open"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        {room.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-900">
                      {formatTime(room.last_message_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/master/chats/${room.id}`}
                        className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}