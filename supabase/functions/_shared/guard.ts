// Caller check for Edge Functions. verify_jwt=true already validated the JWT signature,
// so the role claim can be trusted. The public anon key is also a valid JWT: reject it.
export function roleOf(req: Request): string | null {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)))
    return typeof json.role === 'string' ? json.role : null
  } catch {
    return null
  }
}

export function rejectUnlessRole(
  req: Request,
  allowed: string[],
  headers: Record<string, string> = {},
): Response | null {
  const role = roleOf(req)
  if (role && allowed.includes(role)) return null
  return new Response(JSON.stringify({ error: 'unauthorized' }), {
    status: 401,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}
