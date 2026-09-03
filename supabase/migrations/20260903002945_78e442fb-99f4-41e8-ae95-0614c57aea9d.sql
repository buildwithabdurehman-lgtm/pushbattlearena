REVOKE EXECUTE ON FUNCTION public.global_leaderboard(text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.country_leaderboard(text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.period_start(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_country_rules() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.global_leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.country_leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.period_start(text) TO authenticated;