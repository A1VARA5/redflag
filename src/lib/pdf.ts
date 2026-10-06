// Text from a PDF someone shares in Discord (fake invoices, "updated bank details" letters).
// Email attachments are read by Agentboxd instead; this is for channels without that.
import {extractText, getDocumentProxy} from 'unpdf'

export async function pdfText(bytes: ArrayBuffer, maxChars = 20_000): Promise<string | null> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes))
    const {text} = await extractText(pdf, {mergePages: true})
    const clean = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    return clean ? clean.slice(0, maxChars) : null
  } catch {
    return null
  }
}
