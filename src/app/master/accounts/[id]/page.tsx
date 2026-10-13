import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import AccountActions from "./AccountActions";

export default async function MasterAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("*, profiles!owner_id_fkey(full_name, email, created_at)")
    .eq("id", id)
    .single();

  if (!account) notFound();

  const profile = Array.isArray(account.profiles)
    ? account.profiles[0]
    : account.profiles;

  // Get usage stats
  const [
    { count: roomsCount },
    { count: messagesCount },
    { count: visitorsCount },
  ] = await Promise.all([
    supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .eq("account_id", id),
    supabase
      .from("messages")
      .select("*, chat_rooms!inner(account_id)", {
        count: "exact",
        head: true,
      })
      .eq("chat_rooms.account_id", id),
    supabase
      .from("visitors")
      .select("*", { count: "exact", head: true })
      .eq("account_id", id),
  ]);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    active: "bg-green-100 text-green-700",
    suspended: "bg-red-100 text-red-700",
    rejected: "bg-gray-200 text-gray-900",
  };

  return (
    <div className="max-w-4xl">
      <Link
        href="/master/accounts"
        className="text-sm text-gray-900 hover:text-gray-900 flex items-center gap-1 mb-4"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to accounts
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {account.company_name}
          </h1>
          <p className="text-gray-900 mt-1">
            Account #{account.account_number} ·{" "}
            <code className="text-sm">/{account.account_slug || account.account_number}</code>
          </p>
        </div>
        <span
          className={`text-sm px-3 py-1.5 rounded-full font-medium ${
            statusColors[account.status]
          }`}
        >
          {account.status}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-900 rounded-xl p-4">
          <p className="text-sm text-gray-900">Chat Rooms</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {roomsCount || 0}
          </p>
        </div>
        <div className="bg-white border border-gray-900 rounded-xl p-4">
          <p className="text-sm text-gray-900">Messages</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {messagesCount || 0}
          </p>
        </div>
        <div className="bg-white border border-gray-900 rounded-xl p-4">
          <p className="text-sm text-gray-900">Visitors</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {visitorsCount || 0}
          </p>
        </div>
      </div>

      {/* Owner info */}
      <div className="bg-white border border-gray-900 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Owner</h2>
        <div className="space-y-2 text-sm">
          <div className="flex">
            <span className="w-32 text-gray-900">Name</span>
            <span className="text-gray-900">{profile?.full_name || "—"}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-900">Email</span>
            <span className="text-gray-900">{profile?.email}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-900">User ID</span>
            <code className="text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
              {account.owner_id}
            </code>
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-white border border-gray-900 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex">
            <span className="w-32 text-gray-900">Account ID</span>
            <code className="text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
              {account.id}
            </code>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-900">Created</span>
            <span className="text-gray-900">
              {new Date(account.created_at).toLocaleString("id-ID")}
            </span>
          </div>
          {account.approved_at && (
            <div className="flex">
              <span className="w-32 text-gray-900">Approved</span>
              <span className="text-gray-900">
                {new Date(account.approved_at).toLocaleString("id-ID")}
              </span>
            </div>
          )}
          <div className="flex">
            <span className="w-32 text-gray-900">Trial ends</span>
            <span className="text-gray-900">
              {new Date(account.trial_ends_at).toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <AccountActions
        accountId={account.id}
        currentStatus={account.status}
      />
    </div>
  );
}