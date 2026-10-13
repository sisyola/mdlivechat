import { redirect } from "next/navigation";

export default async function AccountIndex({
  params,
}: {
  params: Promise<{ accountNumber: string }>;
}) {
  const { accountNumber } = await params;
  redirect(`/dashboard/${accountNumber}/inbox`);
}