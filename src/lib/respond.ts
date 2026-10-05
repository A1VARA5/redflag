import respond from '@/data/respond.json'

export type Region = 'UK' | 'US' | 'EU'
export type Situation = 'received_only' | 'clicked_link' | 'entered_details' | 'paid_money' | 'gave_code_or_remote_access'

export const SITUATIONS: {id: Situation; label: string}[] = [
  {id: 'received_only', label: 'Just got it'},
  {id: 'clicked_link', label: 'I clicked the link'},
  {id: 'entered_details', label: 'I typed in details'},
  {id: 'paid_money', label: 'I paid'},
  {id: 'gave_code_or_remote_access', label: 'I gave a code or let them in'},
]

type Step = string | {text: string; url?: string}
export function stepsFor(region: Region, situation: Situation): {text: string; url?: string}[] {
  const r = (respond as unknown as Record<string, Record<string, Step[]>>)[region] ?? {}
  return (r[situation] ?? r.received_only ?? []).map((s) => (typeof s === 'string' ? {text: s} : s))
}
