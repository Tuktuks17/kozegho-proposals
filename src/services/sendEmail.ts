import { supabase } from '@/lib/supabase'

type Attachment = {
  filename: string
  path: string // path inside 'datasheets' bucket
}

// RFC 2047 encoded-word for non-ASCII MIME headers (Subject, filenames with accents)
function encodeMimeHeader(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value
  const encoder = new TextEncoder()
  const bytes = encoder.encode(value)
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return `=?UTF-8?B?${btoa(binary)}?=`
}

// Safely converts any Blob (including PDFs) to base64 string.
// Processes in chunks to avoid call-stack overflow on large files.
async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

// Encodes a UTF-8 string (may contain accented chars) to base64url for Gmail API.
function toBase64Url(str: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function sendProposalEmail(
  to: string,
  subject: string,
  htmlBody: string,
  attachments: Attachment[]
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.provider_token || sessionStorage.getItem('kp:gmail_token')
  if (!accessToken) {
    throw new Error('Gmail token not available. Please sign out and sign in again.')
  }

  const senderName = (session?.user?.user_metadata?.full_name as string | undefined) || ''
  const senderEmail = session?.user?.email || ''

  // Download all attachments from Supabase Storage
  const attachmentParts: Array<{ filename: string; base64: string }> = []
  for (const att of attachments) {
    const { data, error } = await supabase.storage.from('datasheets').download(att.path)
    if (error || !data) {
      console.warn(`Skipping attachment ${att.filename}: ${error?.message}`)
      continue
    }
    const base64 = await blobToBase64(data)
    attachmentParts.push({ filename: att.filename, base64 })
  }

  // Base64-encode the HTML body so the MIME string stays ASCII-safe
  // (Portuguese accented chars would break btoa on the full MIME)
  const htmlBase64 = await blobToBase64(new Blob([htmlBody], { type: 'text/html; charset=utf-8' }))

  // Build MIME multipart/mixed — all parts are base64, so only ASCII in the MIME string
  const boundary = `kozegho_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const lines: string[] = []

  lines.push(`MIME-Version: 1.0`)
  lines.push(`To: ${to}`)
  const fromField = senderName ? `${encodeMimeHeader(senderName)} <${senderEmail}>` : senderEmail
  lines.push(`From: ${fromField}`)
  lines.push(`Subject: ${encodeMimeHeader(subject)}`)
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
  lines.push('')

  // HTML body part (base64 encoded)
  lines.push(`--${boundary}`)
  lines.push(`Content-Type: text/html; charset=utf-8`)
  lines.push(`Content-Transfer-Encoding: base64`)
  lines.push('')
  for (let i = 0; i < htmlBase64.length; i += 76) {
    lines.push(htmlBase64.slice(i, i + 76))
  }
  lines.push('')

  // Attachment parts
  for (const att of attachmentParts) {
    lines.push(`--${boundary}`)
    lines.push(`Content-Type: application/pdf`)
    lines.push(`Content-Disposition: attachment; filename="${att.filename}"`)
    lines.push(`Content-Transfer-Encoding: base64`)
    lines.push('')
    for (let i = 0; i < att.base64.length; i += 76) {
      lines.push(att.base64.slice(i, i + 76))
    }
    lines.push('')
  }

  lines.push(`--${boundary}--`)

  // rawMime is now pure ASCII — toBase64Url uses TextEncoder as extra safety
  const rawMime = lines.join('\r\n')
  const raw = toBase64Url(rawMime)

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
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
