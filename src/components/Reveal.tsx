'use client'

import {useEffect, useRef} from 'react'

// Fades its children in the first time they scroll into view. CSS does the motion (see [data-reveal]).
export function Reveal({children, delay = 0, className = '', as: Tag = 'div'}: {children: React.ReactNode; delay?: number; className?: string; as?: 'div' | 'li' | 'section'}) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.in = 'true'
          io.disconnect()
        }
      },
      {rootMargin: '0px 0px -5% 0px'},
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref as never} data-reveal="" className={className} style={{'--d': `${delay}ms`} as React.CSSProperties}>
      {children}
    </Tag>
  )
}
