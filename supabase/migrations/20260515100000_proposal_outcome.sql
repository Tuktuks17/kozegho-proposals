-- ============================================================================
-- Kozegho Proposals v2 — Add outcome column to proposals
-- Migration: 20260515100000_proposal_outcome
-- ============================================================================

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS outcome text
  CHECK (outcome IN ('accepted', 'rejected', 'open'))
  DEFAULT 'open';
