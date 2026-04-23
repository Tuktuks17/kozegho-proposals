// Lazy-initialise pdf.js with the correct worker path for Vite
// pdfjs-dist is excluded from optimizeDeps to avoid ESM worker import issues.
let _initialized = false

export async function getPdfLib() {
  if (!_initialized) {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()
    _initialized = true
    return pdfjs
  }
  return import('pdfjs-dist')
}

export async function pdfToArrayBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    return resp.arrayBuffer()
  } catch {
    return null
  }
}
