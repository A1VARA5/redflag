import {after} from 'next/server'
import {check} from '@/lib/verdict'
import {saveVerdict} from '@/lib/store'
import {downloadAttachment, getMessage, htmlToText, renderReply, reply, senderOf, senderVerified, verifyMailroom, type MailMessage} from '@/lib/email'

export const maxDuration = 60

const perSender = new Map<string, number[]>()
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
        console.warn('[email] sender failed SPF/DKIM, not replying', m.id)
        return
      }
      const now = Date.now()
      const recent = (perSender.get(from) ?? []).filter((t) => now - t < 3_600_000)
      if (recent.length >= 10) return
      perSender.set(from, [...recent, now])

      // The full text, not extracted_text: a forward's whole point is the quoted original underneath.
      const body = (m.text?.trim() || (m.html ? htmlToText(m.html) : '') || m.extracted_text || '').slice(0, 60_000)
      if (!body && !m.attachments?.length) {
        console.error('[email] no readable content', m.id, heldReason)
        return
      }
      const text = m.subject ? `Subject: ${m.subject}\n\n${body}` : body
      const imgAtt = m.attachments?.find((a) => /^image\/(png|jpeg|webp|gif)$/.test(a.content_type ?? ''))
      const img = imgAtt ? await downloadAttachment(imgAtt.id) : null

      const signals = [
        m.ai?.risk?.phishing !== undefined ? `Agentboxd phishing score for this email: ${m.ai.risk.phishing}` : '',
        m.ai?.risk?.injection !== undefined ? `Agentboxd prompt-injection score: ${m.ai.risk.injection}` : '',
        heldReason ? `The mail provider quarantined this email before any agent could read it (reason: ${heldReason}).` : '',
        'This email was most likely forwarded by the person asking. The forwarder is not the suspect; judge the forwarded content underneath. Sender authentication results describe the forward, not the original.',
      ]
        .filter(Boolean)
        .join('\n')

      const v = await check({
        text,
        image: img ? {mediaType: imgAtt!.content_type as 'image/png', data: img.data} : null,
        source: 'email',
        region: 'UK',
        extraSignals: signals,
      })
      await saveVerdict(v)
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
      const {text: t, html} = renderReply(v, `${site}/v/${v.id}`)
      await reply(inboxId, m.id, t, html)
      console.log('[email] replied', v.id, v.verdict, v.ms + 'ms')
    } catch (e) {
      console.error('[email]', e)
    }
  })
  return new Response('ok')
}
