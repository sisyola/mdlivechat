import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getAccountContext } from "@/lib/supabase/account-context";
import MasterChatView from "./MasterChatView";

export default async function MasterChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAccountContext();
  if (!ctx?.isMasterAdmin) notFound();

  const supabase = await createClient();
  const { data: room } = await supabase
    .from("chat_rooms")
    .select("*, accounts(id, company_name, account_number, status)")
    .eq("id", id)
    .single();

  if (!room) notFound();

  return (
    <MasterChatView room={room} masterId={ctx.user.id} />
  );
}