import { createClient } from "./server";
import type { Account, AccountSettings, GlobalRole } from "../types";

export interface AccountContext {
  user: { id: string; email: string };
  profile: { global_role: GlobalRole; full_name: string | null };
  accounts: Account[];
  currentAccount: Account | null;
  currentAccountSettings: AccountSettings | null;
  isMasterAdmin: boolean;
}

/**
 * Get the current account context for the logged-in user.
 * If accountNumber is provided, returns that account.
 * Otherwise returns the first active account.
 */
export async function getAccountContext(
  accountNumber?: string
): Promise<AccountContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("global_role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  // Get all accounts owned by user
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  const allAccounts = accounts || [];
  const isMasterAdmin = profile.global_role === "master_admin";

  // Determine current account
  let currentAccount: Account | null = null;
  if (accountNumber) {
    currentAccount =
      allAccounts.find((a) => a.account_number === accountNumber) || null;
  } else {
    currentAccount = allAccounts.find((a) => a.status === "active") || null;
  }

  // Load settings for current account
  let currentAccountSettings: AccountSettings | null = null;
  if (currentAccount) {
    const { data: settings } = await supabase
      .from("account_settings")
      .select("*")
      .eq("account_id", currentAccount.id)
      .single();
    currentAccountSettings = settings;
  }

  return {
    user: { id: user.id, email: user.email || "" },
    profile: {
      global_role: profile.global_role,
      full_name: profile.full_name,
    },
    accounts: allAccounts,
    currentAccount,
    currentAccountSettings,
    isMasterAdmin,
  };
}

/**
 * Get current account number from cookie, or first active account.
 * Used in dashboard pages to scope queries.
 */
export async function getCurrentAccountNumber(): Promise<string | null> {
  const ctx = await getAccountContext();
  return ctx?.currentAccount?.account_number || null;
}