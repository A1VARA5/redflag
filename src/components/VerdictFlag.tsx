// The result's own red flag: it runs up the pole for a scam, stops part way when it's suspicious or unclear,
// and hangs limp at the bottom when the message looks fine. It plays once, when the result arrives.
import type {VerdictKind} from '@/lib/labels'

const POSE: Record<VerdictKind, {from: number; to: number; limp: boolean; flutter: boolean}> = {
  scam: {from: 25, to: 3, limp: false, flutter: true},
  suspicious: {from: 25, to: 8, limp: false, flutter: false},
  unclear: {from: 25, to: 15, limp: false, flutter: false},
  safe: {from: 10, to: 22, limp: true, flutter: false},
}

export function VerdictFlag({kind, className = ''}: {kind: VerdictKind; className?: string}) {
  const p = POSE[kind]
  return (
    <svg viewBox="0 0 44 44" className={`verdict-flag ${className}`} aria-hidden>
      <line x1="9" y1="4" x2="9" y2="41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5" />
      <circle cx="9" cy="3.2" r="1.9" fill="currentColor" opacity=".7" />
      <line x1="4.5" y1="41.5" x2="13.5" y2="41.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5" />
      <g className="verdict-flag-cloth" style={{'--from': `${p.from}px`, '--to': `${p.to}px`} as React.CSSProperties}>
        <path
          className={p.flutter ? 'verdict-flag-flutter' : undefined}
          fill="currentColor"
          d={p.limp ? 'M10 0 L18 1 C16 7 19.5 12 15.5 18 L10 16 Z' : 'M10 0 C16 -2 22 2 32 0 L32 13 C22 15 16 11 10 13 Z'}
        />
      </g>
    </svg>
  )
}
