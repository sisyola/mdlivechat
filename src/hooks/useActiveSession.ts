"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const HEARTBEAT_INTERVAL = 30000; // 30s

/**
 * Track active session for online status.
 * Heartbeat every 30s, expires after 2 min of no heartbeat.
 */
export function useActiveSession(accountId?: string) {
  const supabase = createClient();
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let interval: NodeJS.Timeout | null = null;

    async function start() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      // Create session
      const { data, error } = await supabase
        .from("active_sessions")
        .insert({
          user_id: user.id,
          account_id: accountId || null,
          session_token: `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          ip_address: null, // We can't easily get IP client-side
          user_agent: navigator.userAgent,
        })
        .select("id")
        .single();

      if (!error && data) {
        sessionIdRef.current = data.id;
      }

      // Heartbeat
      interval = setInterval(async () => {
        if (!sessionIdRef.current) return;
        await supabase
          .from("active_sessions")
          .update({ last_heartbeat: new Date().toISOString() })
          .eq("id", sessionIdRef.current);
      }, HEARTBEAT_INTERVAL);
    }

    start();

    // Cleanup
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
      if (sessionIdRef.current) {
        // Fire and forget delete
        supabase.from("active_sessions").delete().eq("id", sessionIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);
}