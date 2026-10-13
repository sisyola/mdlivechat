import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardIndex() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accounts } = await supabase
    .from("accounts")
    .select("account_number, status")
    .eq("owner_id", user.id)
    .eq("status", "active")
    .limit(1);

  const active = accounts?.[0];
  if (active) {
    redirect(`/dashboard/${active.account_number}/inbox`);
  }

  redirect("/pending-approval");
}