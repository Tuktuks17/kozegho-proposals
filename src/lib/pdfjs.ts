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

// Render each page of a PDF to a PNG data URL at the given scale.
// Returns empty array on failure — never throws.
export async function rasterisePdf(bytes: ArrayBuffer, scale = 1.5): Promise<string[]> {
  try {
    const pdfjs = await getPdfLib()
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes) })
    const pdfDoc = await loadingTask.promise
    const pngs: string[] = []

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      try {
        const page = await pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')
        if (!ctx) continue
        await page.render({
          canvasContext: ctx as unknown as CanvasRenderingContext2D,
          viewport,
        }).promise
        // Verify canvas has actual content before converting
        const dataUrl = canvas.toDataURL('image/png')
        if (dataUrl && dataUrl.length > 1000) {
          pngs.push(dataUrl)
        }
      } catch (e) {
        console.warn(`Skipping PDF page ${i}:`, e)
      }
    }

    return pngs
  } catch (e) {
    console.warn('rasterisePdf failed entirely:', e)
    return []
  }
}
