import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function MasterOverviewPage() {
  const supabase = await createClient();

  // Counts
  const [
    { count: totalAccounts },
    { count: activeAccounts },
    { count: suspendedAccounts },
    { count: totalRooms },
    { count: openRooms },
    { count: closedRooms },
    { count: totalMessages },
    { count: totalVisitors },
    { count: activeVisitors },
  ] = await Promise.all([
    supabase.from("accounts").select("*", { count: "exact", head: true }),
    supabase
      .from("accounts")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("accounts")
      .select("*", { count: "exact", head: true })
      .eq("status", "suspended"),
    supabase.from("chat_rooms").select("*", { count: "exact", head: true }),
    supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .eq("status", "closed"),
    supabase.from("messages").select("*", { count: "exact", head: true }),
    supabase.from("visitors").select("*", { count: "exact", head: true }),
    supabase
      .from("visitors")
      .select("*", { count: "exact", head: true })
      .neq("status", "offline"),
  ]);

  // Active sessions (last 2 min heartbeat)
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: activeSessions } = await supabase
    .from("active_sessions")
    .select("*, profiles(full_name, email), accounts(company_name, account_number)")
    .gte("last_heartbeat", twoMinAgo)
    .order("last_heartbeat", { ascending: false });

  // Recent accounts
  const { data: recentAccounts } = await supabase
    .from("accounts")
    .select("*, profiles!owner_id_fkey(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent chat rooms
  const { data: recentRooms } = await supabase
    .from("chat_rooms")
    .select("*, accounts(company_name, account_number)")
    .order("last_message_at", { ascending: false })
    .limit(5);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Overview</h1>
      <p className="text-gray-900 mb-6">
        Platform stats dan aktivitas real-time
      </p>

      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-900 rounded-xl p-5">
          <p className="text-sm text-gray-900 mb-1">Total Accounts</p>
          <p className="text-3xl font-bold text-gray-900">
            {totalAccounts || 0}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {activeAccounts || 0} active
          </p>
        </div>
        <div className="bg-white border border-gray-900 rounded-xl p-5">
          <p className="text-sm text-gray-900 mb-1">Total Chats</p>
          <p className="text-3xl font-bold text-gray-900">
            {totalRooms || 0}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {openRooms || 0} open · {closedRooms || 0} closed
          </p>
        </div>
        <div className="bg-white border border-gray-900 rounded-xl p-5">
          <p className="text-sm text-gray-900 mb-1">Total Messages</p>
          <p className="text-3xl font-bold text-gray-900">
            {totalMessages || 0}
          </p>
        </div>
        <div className="bg-white border border-gray-900 rounded-xl p-5">
          <p className="text-sm text-gray-900 mb-1">Active Visitors</p>
          <p className="text-3xl font-bold text-gray-900">
            {activeVisitors || 0}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            {totalVisitors || 0} total
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Active admins/owners */}
        <div className="bg-white border border-gray-900 rounded-xl lg:col-span-2">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">
              🟢 Active Sessions ({activeSessions?.length || 0})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {!activeSessions || activeSessions.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-gray-900">
                Belum ada admin/owner yang online
              </div>
            ) : (
              activeSessions.map((session) => {
                const profile = Array.isArray(session.profiles)
                  ? session.profiles[0]
                  : session.profiles;
                const account = Array.isArray(session.accounts)
                  ? session.accounts[0]
                  : session.accounts;
                return (
                  <div
                    key={session.id}
                    className="px-5 py-3 flex items-center gap-3"
                  >
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-semibold text-sm">
                        {(profile?.full_name || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {profile?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-900 truncate">
                        {account
                          ? `${account.company_name} (#${account.account_number})`
                          : "Master Admin"}
                      </p>
                    </div>
                    <span className="text-xs text-gray-900">
                      {new Date(session.last_heartbeat).toLocaleTimeString(
                        "id-ID",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-5">
          <h2 className="font-semibold text-orange-900 mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              href="/master/accounts"
              className="block w-full bg-white border border-orange-200 hover:bg-orange-50 text-orange-900 text-sm font-medium px-4 py-2.5 rounded-lg transition"
            >
              📋 Manage Accounts
            </Link>
            <Link
              href="/master/chats"
              className="block w-full bg-white border border-orange-200 hover:bg-orange-50 text-orange-900 text-sm font-medium px-4 py-2.5 rounded-lg transition"
            >
              💬 All Chats
            </Link>
            <Link
              href="/master/users"
              className="block w-full bg-white border border-orange-200 hover:bg-orange-50 text-orange-900 text-sm font-medium px-4 py-2.5 rounded-lg transition"
            >
              👥 Users
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent accounts */}
        <div className="bg-white border border-gray-900 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Recent Accounts</h2>
            <Link
              href="/master/accounts"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              Lihat semua →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {!recentAccounts || recentAccounts.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-900">
                Belum ada akun
              </div>
            ) : (
              recentAccounts.map((account) => {
                const profile = Array.isArray(account.profiles)
                  ? account.profiles[0]
                  : account.profiles;
                return (
                  <Link
                    key={account.id}
                    href={`/master/accounts/${account.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-semibold text-sm">
                      {account.company_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {account.company_name}
                      </p>
                      <p className="text-xs text-gray-900 truncate">
                        {profile?.email}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        account.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {account.status}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Recent chats */}
        <div className="bg-white border border-gray-900 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Recent Chats</h2>
            <Link
              href="/master/chats"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              Lihat semua →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {!recentRooms || recentRooms.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-900">
                Belum ada chat
              </div>
            ) : (
              recentRooms.map((room) => {
                const account = Array.isArray(room.accounts)
                  ? room.accounts[0]
                  : room.accounts;
                return (
                  <Link
                    key={room.id}
                    href={`/master/chats/${room.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-semibold text-sm">
                      {room.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {room.customer_name}
                      </p>
                      <p className="text-xs text-gray-900 truncate">
                        {account
                          ? `${account.company_name} (#${account.account_number})`
                          : ""}
                      </p>
                    </div>
                    <span className="text-xs text-gray-900">
                      {new Date(room.last_message_at).toLocaleTimeString(
                        "id-ID",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}