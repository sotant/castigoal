alter policy "Users can insert their own goal period outcomes"
  on public.goal_period_outcomes
  with check ((select auth.uid()) = user_id);

alter policy "Users can update their own goal period outcomes"
  on public.goal_period_outcomes
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Users can delete their own goal period outcomes"
  on public.goal_period_outcomes
  using ((select auth.uid()) = user_id);
