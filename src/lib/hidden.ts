// Invisible text. Characters people can't see are used to hide instructions from the reader (but not from an AI),
// to break up words so filters miss them, and to flip text direction so a file or link name displays as something
// else. Plain code, no AI: it counts them, decodes hidden "tag" text, and returns a cleaned copy.

export type HiddenReport = {
  zeroWidth: number
  bidi: number
  tags: number
  decoded: string | null
  cleaned: string
}

// Zero width space, word joiner, Mongolian vowel separator, BOM. The zero width joiner (U+200D) is left alone:
// emoji like families and flags are built with it.
const ZERO_WIDTH = /[\u200B\u2060\u180E\uFEFF]/g
// Direction overrides (U+202D, U+202E) are what flip "fdp.exe" into "exe.pdf". Embeddings and isolates
// (U+202A to U+202C, U+2066 to U+2069) are added by Windows, Outlook and Android around copied phone numbers and
// names, so they are removed but not counted. Plain left/right marks are normal in Arabic and Hebrew.
const BIDI = /[\u202D\u202E]/g
const BIDI_HARMLESS = /[\u202A-\u202C\u2066-\u2069]/g
// Unicode "tag" characters mirror ASCII one to one and render as nothing. They can carry a whole hidden sentence.
const TAGS = /[\u{E0000}-\u{E007F}]/gu

export function scanHidden(text: string): HiddenReport {
  const zeroWidth = text.match(ZERO_WIDTH)?.length ?? 0
  const bidi = text.match(BIDI)?.length ?? 0
  const tagChars = text.match(TAGS) ?? []
  const decoded =
    tagChars
      .map((c) => c.codePointAt(0)! - 0xe0000)
      .filter((n) => n >= 0x20 && n < 0x7f)
      .map((n) => String.fromCharCode(n))
      .join('')
      .trim() || null
  const cleaned = text.replace(TAGS, '').replace(BIDI, '').replace(BIDI_HARMLESS, '').replace(ZERO_WIDTH, '')
  return {zeroWidth, bidi, tags: tagChars.length, decoded, cleaned}
}

export function hiddenFindings(h: HiddenReport): string[] {
  const out: string[] = []
  if (h.tags) out.push(`${h.tags} invisible characters carrying hidden text${h.decoded ? `: "${h.decoded.slice(0, 300)}"` : ''}. You can't see it, but an AI can read it.`)
  if (h.bidi) out.push(`${h.bidi === 1 ? 'A hidden text direction control' : `${h.bidi} hidden text direction controls`}, which can make a link or file name look like something it isn't.`)
  if (h.zeroWidth >= 3) out.push(`${h.zeroWidth} invisible spaces, often used to break up words so spam filters miss them.`)
  return out
}

// Hidden tag text or direction tricks have no place in a normal message.
export function hiddenIsHostile(h: HiddenReport): boolean {
  return h.tags > 0 || h.bidi > 0
}
