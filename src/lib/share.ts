// What a phone's share menu hands over (title, text, url) as one message to check. Apps fill these in
// differently: WhatsApp puts everything in text, browsers send the page title and url, some repeat the url in text.
export function sharedText(s: {title?: string | null; text?: string | null; url?: string | null}): string {
  const title = (s.title ?? '').trim()
  const text = (s.text ?? '').trim()
  const url = (s.url ?? '').trim()
  const parts: string[] = []
  if (title && !text.includes(title)) parts.push(title)
  if (text) parts.push(text)
  if (url && !text.includes(url)) parts.push(url)
  return parts.join('\n\n').slice(0, 20_000)
}
