import { supabase } from "@/integrations/supabase/client";

export const ONLINE_WINDOW_MS = 2 * 60_000;

const BOT_NAMES = [
  "Iron-Bot",
  "Rep-Droid",
  "Gym-Bro 9000",
  "Sparring Bot",
  "Cage-Bot",
  "Pushbot Prime",
];

export function randomBotName() {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
}

export type MatchResult = { challengeId: string; vsBot: boolean; opponentName: string };

/**
 * Finds a random online fighter and starts a live match with them.
 * With nobody online, spins up a bot match instead (the bot never beats the player).
 */
export async function findRandomMatch(
  userId: string,
  durationSeconds: number,
): Promise<MatchResult> {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const { data: online, error: onlineError } = await supabase
    .from("profiles")
    .select("id, username")
    .neq("id", userId)
    .gt("last_seen_at", since)
    .limit(20);
  if (onlineError) throw onlineError;

  const pool = online ?? [];
  const pick = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
  const botName = randomBotName();

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      challenger_id: userId,
      opponent_id: pick?.id ?? null,
      duration_seconds: durationSeconds,
      status: "active",
      started_at: new Date().toISOString(),
      is_bot: pick === null,
      bot_name: pick === null ? botName : null,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Could not start the match");

  return {
    challengeId: data.id,
    vsBot: pick === null,
    opponentName: pick?.username ?? botName,
  };
}
