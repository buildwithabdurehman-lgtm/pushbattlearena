import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { useThread } from "@/hooks/use-social";
import { FighterAvatar } from "@/components/FighterAvatar";
import { VerifiedTick } from "@/components/VerifiedTick";

export const Route = createFileRoute("/_authenticated/chat/$userId")({
  head: () => ({
    meta: [
      { title: "Chat — PushOff" },
      { name: "description", content: "Private chat between PushOff fighters." },
      { property: "og:title", content: "Chat — PushOff" },
      { property: "og:description", content: "Private chat between PushOff fighters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { userId } = Route.useParams();
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: other } = useProfile(userId);
  const { data: msgs } = useThread(user?.id, userId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [msgs?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!user || !body || user.id === userId) return;
    setSending(true);
    const { error } = await supabase
      .from("messages")
      .insert({ sender_id: user.id, recipient_id: userId, body: body.slice(0, 1000) });
    setSending(false);
    if (error) return void toast.error("Message not sent");
    setText("");
    void qc.invalidateQueries({ queryKey: ["thread", user.id, userId] });
    void qc.invalidateQueries({ queryKey: ["conversations"] });
  }

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link to="/social" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link to="/u/$userId" params={{ userId }} className="flex items-center gap-2">
          <FighterAvatar url={other?.avatar_url ?? null} name={other?.username ?? "?"} className="h-9 w-9" />
          <span className="flex items-center gap-1 text-sm font-semibold">
            {other?.username ?? "Fighter"}
            {other?.verified && <VerifiedTick className="h-4 w-4" />}
          </span>
        </Link>
      </header>

      <div className="flex-1 space-y-2 px-4 py-4 pb-40">
        {!msgs?.length && (
          <p className="text-center text-xs text-muted-foreground">Say hi and set up a duel.</p>
        )}
        {msgs?.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "panel"
                }`}
              >
                {m.body}
              </p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => void send(e)}
        className="fixed inset-x-0 bottom-16 z-30 mx-auto flex max-w-md gap-2 border-t border-border bg-background px-4 py-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder="Message…"
          className="h-11 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Send"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </main>
  );
}
