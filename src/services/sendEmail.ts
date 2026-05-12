import { supabase } from '@/lib/supabase'

type Attachment = {
  filename: string
  path: string // path inside 'datasheets' bucket
}

export async function sendProposalEmail(
  to: string,
  subject: string,
  htmlBody: string,
  attachments: Attachment[]
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.provider_token
  if (!accessToken) {
    throw new Error('Gmail token not available. Please sign out and sign in again.')
  }

  // Download all attachments from Supabase Storage
  const attachmentParts: Array<{ filename: string; base64: string }> = []
  for (const att of attachments) {
    const { data, error } = await supabase.storage.from('datasheets').download(att.path)
    if (error || !data) {
      console.warn(`Skipping attachment ${att.filename}: ${error?.message}`)
      continue
    }
    const arrayBuffer = await data.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    attachmentParts.push({ filename: att.filename, base64: btoa(binary) })
  }

  // Build MIME multipart/mixed
  const boundary = `kozegho_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const lines: string[] = []

  lines.push(`MIME-Version: 1.0`)
  lines.push(`To: ${to}`)
  lines.push(`Subject: ${subject}`)
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
  lines.push('')

  // HTML body part
  lines.push(`--${boundary}`)
  lines.push(`Content-Type: text/html; charset=utf-8`)
  lines.push(`Content-Transfer-Encoding: quoted-printable`)
  lines.push('')
  lines.push(htmlBody)
  lines.push('')

  // Attachment parts
  for (const att of attachmentParts) {
    lines.push(`--${boundary}`)
    lines.push(`Content-Type: application/pdf`)
    lines.push(`Content-Disposition: attachment; filename="${att.filename}"`)
    lines.push(`Content-Transfer-Encoding: base64`)
    lines.push('')
    // Split base64 into 76-char lines per RFC 2045
    for (let i = 0; i < att.base64.length; i += 76) {
      lines.push(att.base64.slice(i, i + 76))
    }
    lines.push('')
  }

  lines.push(`--${boundary}--`)

  const rawMime = lines.join('\r\n')
  // Encode as base64url
  const base64url = btoa(rawMime)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: base64url }),
    }
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Gmail session expired. Please sign out and sign in again.')
    }
    if (response.status === 403) {
      throw new Error('Gmail permission denied. Please sign out and sign in again to grant email permission.')
    }
    const body = await response.text()
    throw new Error(`Gmail API error ${response.status}: ${body}`)
  }

  const result = await response.json()
  return result.id as string
}
