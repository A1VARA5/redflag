// Text from a PDF someone shares on the website or in Discord (fake invoices, "updated bank details" letters).
// Email attachments are read by Agentboxd instead. Only the first pages are read, with a time limit, so a huge
// PDF can't hold up the check.
import {getDocumentProxy} from 'unpdf'

const MAX_PAGES = 20
const TIME_LIMIT_MS = 10_000

export async function pdfText(bytes: ArrayBuffer, maxChars = 20_000): Promise<string | null> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | null = null
  const read = (async () => {
    pdf = await getDocumentProxy(new Uint8Array(bytes))
    let text = ''
    for (let n = 1; n <= Math.min(pdf.numPages, MAX_PAGES) && text.length < maxChars; n++) {
      const page = await pdf.getPage(n)
      const content = await page.getTextContent()
      for (const item of content.items) if ('str' in item) text += item.str + (item.hasEOL ? '\n' : ' ')
      text += '\n'
    }
    return text
  })()
  try {
    const text = await Promise.race([read, new Promise<null>((r) => setTimeout(() => r(null), TIME_LIMIT_MS))])
    const clean = (text ?? '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    return clean ? clean.slice(0, maxChars) : null
  } catch {
    return null
  } finally {
    read.catch(() => {}).finally(() => (pdf as {destroy?: () => Promise<void>} | null)?.destroy?.().catch(() => {}))
  }
}
