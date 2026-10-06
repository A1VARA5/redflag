'use client'

import {useEffect, useState} from 'react'
import {ShieldX} from './Icons'

// The hero animation: a fake courier text arrives, gets scanned, the giveaway words light up one by one,
// then the verdict slides in. It loops, and shows the finished state straight away for reduced motion.
const STEPS = 7
const STEP_MS = [900, 1500, 700, 700, 700, 900, 4200]

export function PhoneDemo() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const t = setTimeout(() => setStep(STEPS - 1), 0)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS), STEP_MS[step])
    return () => clearTimeout(t)
  }, [step])

  const on = (n: number) => (step >= n ? 'true' : 'false')

  return (
    <div className="relative mx-auto w-[300px] select-none" aria-hidden>
      <div className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(229,57,47,0.22),transparent)] blur-2xl" />
      <div className="rounded-[2.6rem] border border-white/15 bg-[#0d1726] p-2.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
        <div className="relative h-[540px] overflow-hidden rounded-[2.1rem] bg-[#f2f3f7]">
          <div className="flex items-center justify-between px-6 pt-3 text-[12px] font-semibold text-[#0d1b2a]">
            <span>09:41</span>
            <span className="h-5 w-20 rounded-full bg-[#0d1726]" />
            <span>5G</span>
          </div>
          <div className="mt-3 border-b border-black/5 pb-3 text-center">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#c7ccd6] text-[13px] font-semibold text-white">EV</div>
            <div className="mt-1 text-[12px] font-medium text-[#0d1b2a]">Evri</div>
          </div>

          <div className="relative px-4 pt-4">
            {step >= 1 && (
              <div className="pop max-w-[230px] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[13.5px] leading-[1.45] text-[#0d1b2a] shadow-sm">
                Evri: Your parcel is on hold due to an{' '}
                <span className="demo-mark" data-on={on(3)}>
                  unpaid fee of £1.45
                </span>
                . Pay{' '}
                <span className="demo-mark" data-on={on(4)}>
                  within 24 hours
                </span>{' '}
                or it will be returned:{' '}
                <span className="demo-mark text-[#1a5fd0] underline" data-on={on(5)}>
                  evri-redelivery.top/pay
                </span>
              </div>
            )}
            {step === 2 && <div className="scanline" />}
          </div>

          {step >= 2 && step < 6 && (
            <div className="pop absolute inset-x-4 bottom-5 flex items-center gap-2 rounded-xl bg-[#0f2a47] px-3.5 py-2.5 text-[12.5px] text-white">
              <span className="pulse-dot h-2 w-2 rounded-full bg-[#ff6b5f]" />
              {step < 3 ? 'Checking the link…' : `Warning signs found: ${Math.min(step - 2, 3)}`}
            </div>
          )}

          {step >= 6 && (
            <div className="pop absolute inset-x-3 bottom-4 rounded-2xl border border-[#f4c2bd] bg-white p-3.5 shadow-[0_20px_40px_-20px_rgba(200,35,26,0.5)]">
              <div className="flex items-center gap-2.5">
                <ShieldX className="h-8 w-8 text-[#c8231a]" />
                <div>
                  <div className="text-[16px] font-bold leading-tight text-[#c8231a]">This is a scam</div>
                  <div className="text-[11.5px] text-[#44505f]">97% confident · 3 warning signs</div>
                </div>
              </div>
              <div className="mt-2.5 rounded-lg bg-[#fdecea] px-2.5 py-2 text-[11.5px] leading-snug text-[#0d1b2a]">
                <span className="font-semibold">evri-redelivery.top</span> is not Evri&apos;s real site. Registered 3 days ago.
              </div>
              <div className="mt-2 text-[11.5px] font-medium text-[#0f2a47]">Don&apos;t pay. Track it in the Evri app instead.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
