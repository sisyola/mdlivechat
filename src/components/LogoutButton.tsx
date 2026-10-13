"use client";

import { createClient, clearAuthStorage } from "@/lib/supabase/client";

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("signOut error:", err);
    }
    await clearAuthStorage();
    window.location.href = "/login";
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-900 hover:text-red-600 transition font-medium"
    >
      Logout
    </button>
  );
}
