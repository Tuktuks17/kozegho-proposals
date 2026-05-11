import React from 'react'
import { pdf } from '@react-pdf/renderer'
import { ProposalPDFDocument } from './ProposalPDF'
import type { ProposalPDFProps } from './ProposalPDF'
import { logoUrl } from './datasheets'

function arrayBufferToDataUrl(buffer: ArrayBuffer, mime = 'image/png'): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize))
  }
  return `data:${mime};base64,${btoa(binary)}`
}

async function fetchLogoDataUrl(): Promise<string | null> {
  try {
    const resp = await fetch(logoUrl())
    if (!resp.ok) return null
    const buffer = await resp.arrayBuffer()
    return arrayBufferToDataUrl(buffer)
  } catch {
    return null
  }
}

export type GeneratePdfProps = Omit<ProposalPDFProps, 'logoDataUrl'>

export async function generateProposalPdf(props: GeneratePdfProps): Promise<Blob> {
  const logoDataUrl = await fetchLogoDataUrl()

  const element = React.createElement(ProposalPDFDocument, {
    ...props,
    logoDataUrl,
  })

  const blob = await pdf(element).toBlob()
  return blob
}
