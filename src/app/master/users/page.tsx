import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function MasterUsersPage() {
  const supabase = await createClient();

  // Get all profiles with their accounts
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*, accounts(id, company_name, account_number, status)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">All Users</h1>
      <p className="text-gray-900 mb-6">
        Semua user yang terdaftar ({profiles?.length || 0})
      </p>

      <div className="bg-white border border-gray-900 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-900 uppercase">
                User
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-900 uppercase">
                Role
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-900 uppercase">
                Accounts
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-900 uppercase">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!profiles || profiles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-gray-900">
                  Belum ada user
                </td>
              </tr>
            ) : (
              profiles.map((profile) => {
                const accounts = Array.isArray(profile.accounts)
                  ? profile.accounts
                  : profile.accounts
                  ? [profile.accounts]
                  : [];
                return (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                            profile.global_role === "master_admin"
                              ? "bg-gradient-to-br from-red-500 to-orange-600"
                              : "bg-gradient-to-br from-brand-500 to-brand-700"
                          }`}
                        >
                          {(profile.full_name || profile.email)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {profile.full_name || "—"}
                          </p>
                          <p className="text-xs text-gray-900">
                            {profile.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          profile.global_role === "master_admin"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {profile.global_role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {accounts.length === 0 ? (
                        <span className="text-xs text-gray-900">
                          No accounts
                        </span>
                      ) : (
                        <div className="space-y-1">
                          {accounts.map((acc: { id: string; company_name: string; account_number: string }) => (
                            <Link
                              key={acc.id}
                              href={`/master/accounts/${acc.id}`}
                              className="text-sm text-brand-600 hover:text-brand-700 block"
                            >
                              {acc.company_name} (#{acc.account_number})
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-900">
                      {new Date(profile.created_at).toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
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