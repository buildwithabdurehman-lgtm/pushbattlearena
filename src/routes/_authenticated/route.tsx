import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { CountryGate } from "@/components/CountryGate";
import { useSession } from "@/hooks/use-session";
import { usePresence } from "@/hooks/use-presence";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = useSession();
  usePresence(user?.id);

  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-24">
      <Outlet />
      <BottomNav />
      <CountryGate />
    </div>
  );
}
