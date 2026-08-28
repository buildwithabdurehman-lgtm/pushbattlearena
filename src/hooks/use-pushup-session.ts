import { useCallback, useEffect, useRef, useState } from "react";

export type BattleStatus = "idle" | "running" | "paused" | "finished";

/**
 * Owns battle state (reps + elapsed time) independently of how reps are
 * detected. Today reps arrive from the manual +1 / -1 buttons via `addRep`.
 * A future camera-based detector can call the same `addRep(1)` on each
 * detected push-up without any change to the UI or persistence layer.
 */
export function usePushupSession() {
  const [reps, setReps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<BattleStatus>("idle");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status !== "running") return;
    timer.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [status]);

  const start = useCallback(() => setStatus("running"), []);
  const pause = useCallback(() => setStatus("paused"), []);
  const finish = useCallback(() => setStatus("finished"), []);
  const reset = useCallback(() => {
    setReps(0);
    setSeconds(0);
    setStatus("idle");
  }, []);

  const addRep = useCallback((delta = 1) => {
    setReps((value) => Math.max(0, value + delta));
  }, []);

  return { reps, seconds, status, start, pause, finish, reset, addRep };
}
