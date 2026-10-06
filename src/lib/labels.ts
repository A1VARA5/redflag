// One set of verdict words and colours for the page, the email reply, Discord and the share cards.
export type VerdictKind = 'scam' | 'suspicious' | 'unclear' | 'safe'

export const VERDICT_TITLE: Record<VerdictKind, string> = {
  scam: 'This is a scam',
  suspicious: 'This looks suspicious',
  unclear: "We can't tell",
  safe: 'No red flags found',
}

export const VERDICT_SHORT: Record<VerdictKind, string> = {
  scam: 'Scam',
  suspicious: 'Suspicious',
  unclear: "Can't tell",
  safe: 'No red flags found',
}

// Same values as the light theme in globals.css.
export const VERDICT_COLOR: Record<VerdictKind, string> = {
  scam: '#c8231a',
  suspicious: '#a15c07',
  unclear: '#44505f',
  safe: '#0f6b46',
}

export const VERDICT_BG: Record<VerdictKind, string> = {
  scam: '#fdecea',
  suspicious: '#fff4e0',
  unclear: '#eef1f5',
  safe: '#e6f4ed',
}

// Confidence is only shown when there is something to be confident about.
export function confidenceText(v: {verdict: VerdictKind; confidence: number}): string | null {
  return v.verdict === 'scam' || v.verdict === 'suspicious' ? `${v.confidence}% confident` : null
}

export const BANK_ADVICE = 'If money is involved, call your bank on the number on the back of your card, never one from the message.'
