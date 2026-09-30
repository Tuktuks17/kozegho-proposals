// Retired 2026-10-01 (security hardening): unused by the app. Original code is in git history.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

Deno.serve(() =>
  new Response(JSON.stringify({ error: 'gone' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' },
  }),
)
