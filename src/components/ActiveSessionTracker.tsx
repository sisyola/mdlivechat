"use client";

import { useActiveSession } from "@/hooks/useActiveSession";

export default function ActiveSessionTracker({
  accountId,
}: {
  accountId: string;
}) {
  useActiveSession(accountId);
  return null;
}