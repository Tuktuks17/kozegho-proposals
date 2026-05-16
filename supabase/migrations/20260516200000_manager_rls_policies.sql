-- ============================================================================
-- Kozegho Proposals v2 — RBAC: manager visibility policies
-- Migration: 20260516200000_manager_rls_policies
--
-- Managers can see ALL records across all users.
-- Existing policies (scoped to created_by = auth.uid()) continue to apply
-- for salesperson role. PostgreSQL RLS ORs multiple permissive policies,
-- so a manager matches BOTH their own-row policy and this manager policy.
-- ============================================================================

-- Proposals: managers see all
CREATE POLICY "managers_see_all_proposals"
  ON public.proposals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- Customers: managers see all
CREATE POLICY "managers_see_all_customers"
  ON public.customers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- Interactions: managers see all (for Intelligence analytics)
CREATE POLICY "managers_see_all_interactions"
  ON public.interactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- relationship_scores: managers see all
CREATE POLICY "managers_see_all_scores"
  ON public.relationship_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );
