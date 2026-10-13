import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function MasterAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || "all";
  const supabase = await createClient();

  let query = supabase
    .from("accounts")
    .select("*, profiles!owner_id_fkey(full_name, email)")
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: accounts } = await query;

  const tabs = [
    { value: "all", label: "Semua" },
    { value: "active", label: "Active" },
    { value: "suspended", label: "Suspended" },
  ];

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    suspended: "bg-red-100 text-red-700",
    cancelled: "bg-gray-200 text-gray-900",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Accounts</h1>
      <p className="text-gray-900 mb-6">
        Manage semua akun yang terdaftar di platform
      </p>

      {/* Tabs */}
      <div className="bg-white border border-gray-900 rounded-xl mb-6">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={`/master/accounts?status=${tab.value}`}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                status === tab.value
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-900 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Accounts list */}
      <div className="bg-white border border-gray-900 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider">
                Company
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider">
                Owner
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider">
                Account #
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider">
                Created
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-900 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!accounts || accounts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-gray-900 text-sm"
                >
                  Tidak ada akun dengan status &quot;{status}&quot;
                </td>
              </tr>
            ) : (
              accounts.map((account) => {
                const profile = Array.isArray(account.profiles)
                  ? account.profiles[0]
                  : account.profiles;
                return (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-semibold text-sm">
                          {account.company_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">
                          {account.company_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-900">
                      <div>
                        <p>{profile?.full_name || "—"}</p>
                        <p className="text-xs text-gray-900">
                          {profile?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <code className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {account.account_number}
                      </code>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                          statusColors[account.status] || statusColors.pending
                        }`}
                      >
                        {account.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-900">
                      {new Date(account.created_at).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/master/accounts/${account.id}`}
                        className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                      >
                        Detail →
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