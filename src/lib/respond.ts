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

type Channel = {name: string; how: string; url: string; source: string}
type Block = {steps: string[]; channels: string[]}
const R = respond as unknown as {channels: Record<string, Channel>} & Record<string, Record<string, Block>>

// Plain steps first, then the official places to report it, each linked to its source.
export function stepsFor(region: Region, situation: Situation): {text: string; url?: string}[] {
  const block = R[region]?.[situation] ?? R[region]?.received_only
  if (!block) return []
  return [
    ...block.steps.map((text) => ({text})),
    ...block.channels.map((id) => R.channels[id]).filter(Boolean).map((c) => ({text: `${c.name}: ${c.how}`, url: c.url})),
  ]
}
