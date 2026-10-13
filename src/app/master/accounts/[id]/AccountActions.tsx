"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AccountStatus } from "@/lib/types";

interface AccountActionsProps {
  accountId: string;
  currentStatus: AccountStatus;
}

export default function AccountActions({
  accountId,
  currentStatus,
}: AccountActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: AccountStatus) {
    if (loading) return;
    if (
      !confirm(
        `Yakin mau set status akun ini jadi "${status}"?${
          status === "suspended"
            ? "\n\nUser bakal ga bisa login."
            : ""
        }`
      )
    )
      return;

    setLoading(true);
    const { error } = await supabase
      .from("accounts")
      .update({ status })
      .eq("id", accountId);

    if (error) {
      alert("Gagal update: " + error.message);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  if (currentStatus === "active") {
    return (
      <div className="bg-white border border-gray-900 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => updateStatus("suspended")}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            ⏸ Suspend
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-900 rounded-xl p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Actions</h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => updateStatus("active")}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          ▶ Activate
        </button>
      </div>
    </div>
  );
}