import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_MS = 30_000;

/** Keeps `last_seen_at` fresh so matchmaking can tell who is online. */
export function usePresence(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    let active = true;

    const ping = async () => {
      if (!active || document.visibilityState === "hidden") return;
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", userId);
    };

    void ping();
    const id = setInterval(() => void ping(), HEARTBEAT_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [userId]);
}
