type EmailParams = {
  clientName: string
  clientCompany: string
  proposalNumber: string
  subject: string
  commercialName: string
  datasheetCount: number
}

type Template = (p: EmailParams) => string

const BASE_STYLE = `
  font-family: Arial, sans-serif; font-size: 14px; color: #333;
  max-width: 600px; margin: 0 auto; line-height: 1.6;
`
const GREEN = '#7AB648'

function wrap(body: string, commercialName: string): string {
  return `
<div style="${BASE_STYLE}">
  <div style="border-bottom: 3px solid ${GREEN}; padding-bottom: 12px; margin-bottom: 20px;">
    <span style="font-size: 22px; font-weight: bold; color: ${GREEN};">Kozegho</span>
  </div>
  ${body}
  <div style="border-top: 1px solid #eee; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #888;">
    ${commercialName} · Kozegho, Lda.<br/>
    <a href="https://www.kozegho.com" style="color: ${GREEN};">www.kozegho.com</a>
  </div>
</div>`
}

const TEMPLATES: Record<string, Template> = {
  PT: ({ clientName, proposalNumber, subject, commercialName, datasheetCount }) =>
    wrap(`
      <p>Exmo(a). Sr(a). <strong>${clientName}</strong>,</p>
      <p>Conforme combinado, enviamos em anexo a nossa proposta comercial <strong>${proposalNumber}</strong> referente a <em>${subject}</em>.</p>
      ${datasheetCount > 0 ? `<p>Junto seguem igualmente as fichas técnicas dos equipamentos propostos para sua referência.</p>` : ''}
      <p>Ficamos ao dispor para qualquer esclarecimento ou para agendar uma reunião de acompanhamento.</p>
      <p>Com os melhores cumprimentos,</p>
    `, commercialName),

  EN: ({ clientName, proposalNumber, subject, commercialName, datasheetCount }) =>
    wrap(`
      <p>Dear <strong>${clientName}</strong>,</p>
      <p>Please find attached our commercial proposal <strong>${proposalNumber}</strong> regarding <em>${subject}</em>.</p>
      ${datasheetCount > 0 ? `<p>We have also enclosed the technical datasheets for the proposed equipment for your reference.</p>` : ''}
      <p>Please do not hesitate to contact us should you have any questions or wish to arrange a follow-up meeting.</p>
      <p>Kind regards,</p>
    `, commercialName),

  FR: ({ clientName, proposalNumber, subject, commercialName, datasheetCount }) =>
    wrap(`
      <p>Madame, Monsieur <strong>${clientName}</strong>,</p>
      <p>Veuillez trouver ci-joint notre proposition commerciale <strong>${proposalNumber}</strong> concernant <em>${subject}</em>.</p>
      ${datasheetCount > 0 ? `<p>Nous vous transmettons également les fiches techniques des équipements proposés pour votre référence.</p>` : ''}
      <p>Nous restons à votre entière disposition pour tout renseignement complémentaire.</p>
      <p>Cordialement,</p>
    `, commercialName),

  ES: ({ clientName, proposalNumber, subject, commercialName, datasheetCount }) =>
    wrap(`
      <p>Estimado/a <strong>${clientName}</strong>,</p>
      <p>Conforme lo acordado, le enviamos adjunta nuestra propuesta comercial <strong>${proposalNumber}</strong> relativa a <em>${subject}</em>.</p>
      ${datasheetCount > 0 ? `<p>Adjuntamos igualmente las fichas técnicas de los equipos propuestos para su referencia.</p>` : ''}
      <p>Quedamos a su disposición para cualquier aclaración o para concertar una reunión de seguimiento.</p>
      <p>Atentamente,</p>
    `, commercialName),

  DE: ({ clientName, proposalNumber, subject, commercialName, datasheetCount }) =>
    wrap(`
      <p>Sehr geehrte(r) <strong>${clientName}</strong>,</p>
      <p>Wie besprochen übersenden wir Ihnen anbei unser Angebot <strong>${proposalNumber}</strong> bezüglich <em>${subject}</em>.</p>
      ${datasheetCount > 0 ? `<p>Die technischen Datenblätter der angebotenen Geräte finden Sie ebenfalls im Anhang.</p>` : ''}
      <p>Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.</p>
      <p>Mit freundlichen Grüßen,</p>
    `, commercialName),
}

export function buildEmailBody(language: string, params: EmailParams): string {
  const lang = language.toUpperCase()
  const template = TEMPLATES[lang] ?? TEMPLATES.PT
  return template(params)
}

export const EMAIL_SUBJECTS: Record<string, string> = {
  PT: 'Proposta Comercial Kozegho',
  EN: 'Kozegho Commercial Proposal',
  FR: 'Offre Commerciale Kozegho',
  ES: 'Propuesta Comercial Kozegho',
  DE: 'Kozegho Angebot',
}

export function buildEmailSubject(language: string, proposalNumber: string): string {
  const lang = language.toUpperCase()
  const prefix = EMAIL_SUBJECTS[lang] ?? EMAIL_SUBJECTS.PT
  return `${prefix} – ${proposalNumber}`
}
