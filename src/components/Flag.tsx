import Link from 'next/link'

export function Flag({size = 28}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--navy)" />
      <path d="M10 7v18" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11.4 8.2c4.4-2.3 7.6 2.1 13.2 0v8.8c-5.6 2.1-8.8-2.3-13.2 0z" fill="#e5392f" />
    </svg>
  )
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-ink">
      <Flag />
      Red Flag
    </Link>
  )
}
