import {after} from 'next/server'
import {check} from '@/lib/verdict'
import {saveVerdict} from '@/lib/store'
import {HTML_LIMIT, attachmentText, downloadAttachment, getMessage, hiddenHtmlText, htmlToText, renderReply, reply, senderOf, senderVerified, verifyMailroom, type MailMessage} from '@/lib/email'

export const maxDuration = 60

const perSender = new Map<string, number[]>()
// Agentboxd allows 20 sends a day. Keep a few back, and stop one address using them all.
const DAILY_REPLIES = 18
const PER_SENDER_PER_DAY = 6
let today = {day: '', sent: 0}
const EU_TLDS = new Set(['ie', 'de', 'fr', 'nl', 'es', 'it', 'lt', 'pl', 'be', 'at', 'pt', 'se', 'dk', 'fi', 'cz', 'ro', 'hu', 'gr', 'bg', 'hr', 'sk', 'si', 'lv', 'ee', 'lu', 'mt', 'cy', 'eu'])

// The forwarder's own address is the only hint at where they live. Their full report can switch regions.
function regionFor(address: string): 'UK' | 'US' | 'EU' {
  const tld = address.split('.').pop() ?? ''
  return tld === 'us' || tld === 'edu' || tld === 'gov' ? 'US' : EU_TLDS.has(tld) ? 'EU' : 'UK'
}

const withDeadline = <T,>(p: Promise<T>, ms: number, fallback: T) => Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))])
const seen = new Set<string>()

// Agentboxd webhook: message.received. Answer 200 straight away (they time out at 10 s), do the work in after().
export async function POST(req: Request) {
  const raw = await req.text()
  if (!verifyMailroom(raw, req.headers.get('x-mailroom-timestamp'), req.headers.get('x-mailroom-signature'))) {
    return new Response('bad signature', {status: 401})
  }
  const evt = JSON.parse(raw) as {id: string; type: string; data?: {inbox?: {id: string; address?: string}; message?: MailMessage}}
  if (evt.type !== 'message.received' || !evt.data?.message) return new Response('ignored')
  if (seen.has(evt.id)) return new Response('duplicate')
  seen.add(evt.id)

  const inboxId = evt.data.inbox?.id ?? process.env.AGENTBOXD_INBOX_ID!
  const inboxAddress = (evt.data.inbox?.address ?? '').toLowerCase()
  const thin = evt.data.message

  after(async () => {
    try {
      const held = thin.screening?.state === 'held' || Boolean(thin.withheld) || !(thin.text || thin.html)
      const m = (held ? await getMessage(thin.id) : thin) ?? thin
      const heldReason = thin.screening?.reason ?? thin.withheld?.reason ?? null
      const from = senderOf(m)
      // Never answer ourselves, bounces or auto-replies: that is how mail loops start.
      if (!from || from === inboxAddress || /mailer-daemon|postmaster|no-?reply/i.test(from) || /^(re: )?red flag verdict/i.test(m.subject ?? '')) return
      if (!senderVerified(m)) {
        console.warn('[email] sender failed SPF/DKIM, not replying', JSON.stringify(m.id))
        return
      }
      const now = Date.now()
      const day = new Date(now).toISOString().slice(0, 10)
      if (today.day !== day) today = {day, sent: 0}
      const recent = (perSender.get(from) ?? []).filter((t) => now - t < 86_400_000)
      if (recent.length >= PER_SENDER_PER_DAY || today.sent >= DAILY_REPLIES) {
        console.warn('[email] reply limit reached', JSON.stringify(from), today.sent)
        return
      }
      perSender.set(from, [...recent, now])
      today.sent++

      // The full text, not extracted_text: a forward's whole point is the quoted original underneath.
      const html = m.html?.slice(0, HTML_LIMIT) ?? null
      const body = (m.text?.trim() || (html ? htmlToText(html) : '') || m.extracted_text || '').slice(0, 200_000)
      if (!body && !m.attachments?.length) {
        console.error('[email] no readable content', JSON.stringify(m.id), JSON.stringify(heldReason))
        return
      }
      const imgAtt = m.attachments?.find((a) => /^image\/(png|jpeg|webp|gif)$/.test(a.content_type ?? ''))
      // Documents only: inline logos and signature images are images, and tiny files are rarely the scam.
      const docs = (m.attachments ?? []).filter((a) => !/^image\//i.test(a.content_type ?? '') && (a.size ?? 10_000) >= 2_000).slice(0, 2)
      const [img, ...docTexts] = await withDeadline(
        Promise.all([imgAtt ? downloadAttachment(imgAtt.id) : null, ...docs.map((a) => attachmentText(m.id, a.id))]),
        15_000,
        [null, ...docs.map(() => null)],
      )
      const attached = docs
        .map((a, i) => (docTexts[i] ? `\n\n[Attached file: ${a.filename ?? 'document'}]\n${docTexts[i]}` : ''))
        .join('')
      const text = (m.subject ? `Subject: ${m.subject}\n\n${body}` : body) + attached

      const signals = [
        m.ai?.risk?.phishing !== undefined ? `Agentboxd phishing score for this email: ${m.ai.risk.phishing}` : '',
        m.ai?.risk?.injection !== undefined ? `Agentboxd prompt-injection score: ${m.ai.risk.injection}` : '',
        m.ai?.local_screen?.hidden_chars ? `Agentboxd found ${m.ai.local_screen.hidden_chars} hidden or invisible characters in this email, a common way to hide instructions from people.` : '',
        m.ai?.local_screen?.flagged ? `Agentboxd's own screen flagged this email${m.ai.local_screen.reasons?.length ? ` (${m.ai.local_screen.reasons.join(', ')})` : ''}.` : '',
        docs.length ? `The email has ${docs.length} attached file(s); their text is included below the email body.` : '',
        heldReason ? `The mail provider quarantined this email before any agent could read it (reason: ${heldReason}).` : '',
        'This email was most likely forwarded by the person asking. The forwarder is not the suspect; judge the forwarded content underneath. Sender authentication results describe the forward, not the original.',
      ]
        .filter(Boolean)
        .join('\n')

      // The plain text part can look clean while the HTML hides instructions for an AI, so scan the HTML too.
      const hiddenText = html ? hiddenHtmlText(html) : []
      const v = await check({
        hiddenText,
        text,
        image: img ? {mediaType: imgAtt!.content_type as 'image/png', data: img.data} : null,
        source: 'email',
        region: regionFor(from),
        extraSignals: signals,
      })
      await saveVerdict(v)
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
      const out = renderReply(v, `${site}/v/${v.id}`)
      await reply(inboxId, m.id, out.text, out.html)
      console.log('[email] replied', v.id, v.verdict, v.ms + 'ms')
    } catch (e) {
      console.error('[email]', e)
    }
  })
  return new Response('ok')
}
