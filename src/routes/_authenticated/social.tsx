import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useConversations, useFollowCounts, useFollowList } from "@/hooks/use-social";
import { FighterAvatar } from "@/components/FighterAvatar";
import { VerifiedTick } from "@/components/VerifiedTick";

export const Route = createFileRoute("/_authenticated/social")({
  head: () => ({
    meta: [
      { title: "Social — PushOff" },
      { name: "description", content: "Chat with fighters and manage who you follow on PushOff." },
      { property: "og:title", content: "Social — PushOff" },
      { property: "og:description", content: "Messages, followers and following on PushOff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SocialPage,
});

type Tab = "chats" | "followers" | "following";

function SocialPage() {
  const { user } = useSession();
  const [tab, setTab] = useState<Tab>("chats");
  const counts = useFollowCounts(user?.id);

  const tabs: { id: Tab; label: string }[] = [
    { id: "chats", label: "Chats" },
    { id: "followers", label: `Followers ${counts.data?.followers ?? ""}` },
    { id: "following", label: `Following ${counts.data?.following ?? ""}` },
  ];

  return (
    <main className="px-5 pt-8 pb-28">
      <h1 className="text-3xl">Social</h1>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg py-2 text-[10px] font-semibold uppercase tracking-widest ${
              tab === t.id ? "bg-primary text-primary-foreground" : "panel text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "chats" ? <Chats me={user?.id} /> : <People me={user?.id} kind={tab} />}
    </main>
  );
}

function Chats({ me }: { me: string | undefined }) {
  const { data, isPending } = useConversations(me);
  if (isPending) return <p className="mt-6 text-xs text-muted-foreground">Loading chats…</p>;
  if (!data?.length)
    return (
      <p className="mt-6 text-xs text-muted-foreground">
        No chats yet. Open a fighter's profile and tap Message.
      </p>
    );
  return (
    <ul className="mt-4 space-y-2">
      {data.map((c) => (
        <li key={c.other.id}>
          <Link
            to="/chat/$userId"
            params={{ userId: c.other.id }}
            className="panel flex items-center gap-3 p-3"
          >
            <FighterAvatar url={c.other.avatar_url} name={c.other.username} className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-semibold">
                {c.other.username}
                {c.other.verified && <VerifiedTick className="h-4 w-4" />}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {c.last.sender_id === me ? "You: " : ""}
                {c.last.body}
              </p>
            </div>
            {c.unread > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                {c.unread}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function People({ me, kind }: { me: string | undefined; kind: "followers" | "following" }) {
  const { data, isPending } = useFollowList(me, kind);
  if (isPending) return <p className="mt-6 text-xs text-muted-foreground">Loading…</p>;
  if (!data?.length)
    return (
      <p className="mt-6 text-xs text-muted-foreground">
        {kind === "followers" ? "No followers yet." : "You aren't following anyone yet."}
      </p>
    );
  return (
    <ul className="mt-4 space-y-2">
      {data.map((p) => (
        <li key={p.id} className="panel flex items-center gap-3 p-3">
          <Link to="/u/$userId" params={{ userId: p.id }} className="flex min-w-0 flex-1 items-center gap-3">
            <FighterAvatar url={p.avatar_url} name={p.username} className="h-10 w-10" />
            <p className="flex items-center gap-1 truncate text-sm font-semibold">
              {p.username}
              {p.verified && <VerifiedTick className="h-4 w-4" />}
            </p>
          </Link>
          <Link
            to="/chat/$userId"
            params={{ userId: p.id }}
            aria-label={`Message ${p.username}`}
            className="rounded-lg p-2 text-primary"
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
