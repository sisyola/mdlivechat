import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAccountContext } from "@/lib/supabase/account-context";
import MasterSidebar from "@/components/MasterSidebar";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAccountContext();
  if (!ctx || !ctx.isMasterAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <MasterSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-900 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900">Master Admin</h1>
                  <p className="text-xs text-gray-900">Super control panel</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {ctx.profile.full_name || ctx.user.email}
                  </p>
                  <p className="text-xs text-gray-900">Master Admin</p>
                </div>
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}