'use client'

// "Spot the scam": one message at a time, the visitor calls it, then sees the parts that give it away.
import {useEffect, useRef, useState} from 'react'
import Link from 'next/link'
import {QUIZ, type QuizItem} from '@/lib/quiz'

function Marked({item, show}: {item: QuizItem; show: boolean}) {
  if (!show) return <>{item.body}</>
  const spots = item.marks
    .map((m, n) => ({n, start: item.body.indexOf(m.quote), end: item.body.indexOf(m.quote) + m.quote.length}))
    .filter((s) => s.start >= 0)
    .sort((a, b) => a.start - b.start)
  const out: React.ReactNode[] = []
  let at = 0
  for (const s of spots) {
    if (s.start < at) continue
    out.push(item.body.slice(at, s.start))
    out.push(
      <mark key={s.n} className={`quiz-mark quiz-mark-${item.kind}`}>
        {item.body.slice(s.start, s.end)}
        <span className="quiz-num" aria-hidden>{s.n + 1}</span>
      </mark>,
    )
    at = s.end
  }
  out.push(item.body.slice(at))
  return <>{out}</>
}

export function SpotTheScam() {
  const [step, setStep] = useState(0)
  const [answer, setAnswer] = useState<'scam' | 'real' | null>(null)
  const [score, setScore] = useState(0)
  const [shared, setShared] = useState<string | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const done = step >= QUIZ.length
  const item = QUIZ[Math.min(step, QUIZ.length - 1)]
  const right = answer === item.kind

  // After an answer, keyboard and screen reader users land on the way forward.
  useEffect(() => {
    if (answer) nextRef.current?.focus({preventScroll: true})
  }, [answer])

  function call(kind: 'scam' | 'real') {
    if (answer) return
    setAnswer(kind)
    if (kind === item.kind) setScore((s) => s + 1)
  }
  function next() {
    setAnswer(null)
    setStep((s) => s + 1)
  }
  function restart() {
    setStep(0)
    setAnswer(null)
    setScore(0)
    setShared(null)
  }
  async function share() {
    const url = `${location.origin}/quiz`
    const text = `I spotted ${score} of ${QUIZ.length} on Red Flag's "Spot the scam". Can you beat it?`
    try {
      if (navigator.share) {
        await navigator.share({title: 'Spot the scam', text, url})
        return
      }
      await navigator.clipboard.writeText(`${text} ${url}`)
      setShared('Link copied. Paste it to whoever needs it.')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setShared(`Copy this link: ${url}`)
    }
  }

  if (done) {
    const verdict =
      score === QUIZ.length ? "All of them. Scammers would struggle with you." : score >= QUIZ.length - 1 ? 'Nearly all. One slipped past, which is exactly how they get people.' : "Some of these are hard, and that's the point. Scams are written to look normal."
    return (
      <div className="quiz-card quiz-end" aria-live="polite">
        <p className="quiz-score tabular">You got {score} of {QUIZ.length}.</p>
        <p className="quiz-end-line">{verdict}</p>
        <p className="quiz-end-line">Next time a message feels off, you don&apos;t have to guess. Paste it into Red Flag and see the evidence.</p>
        <div className="quiz-actions">
          <button type="button" className="button button-red" onClick={share}>Share the quiz</button>
          <Link href="/#check" className="button button-outline">Check a real message</Link>
          <button type="button" className="quiz-again" onClick={restart}>Try again</button>
        </div>
        {shared && <p className="quiz-shared" role="status">{shared}</p>}
      </div>
    )
  }

  return (
    <div className="quiz-card">
      <div className="quiz-top">
        <span className="tabular">Message {step + 1} of {QUIZ.length}</span>
        <span className="tabular">{score} right so far</span>
      </div>
      <figure className="quiz-message">
        <figcaption><span className="quiz-channel">{item.channel}</span><span className="quiz-from" translate="no">{item.from}</span></figcaption>
        <p><Marked item={item} show={Boolean(answer)} /></p>
      </figure>
      {!answer ? (
        <div className="quiz-choices" role="group" aria-label="Is this a scam?">
          <button type="button" className="button button-red" onClick={() => call('scam')}>It&apos;s a scam</button>
          <button type="button" className="button button-outline" onClick={() => call('real')}>It&apos;s real</button>
        </div>
      ) : (
        <div className="quiz-reveal" aria-live="polite">
          <p className={`quiz-result ${right ? 'quiz-right' : 'quiz-wrong'}`}>
            {right ? 'Right.' : 'Not this time.'} {item.kind === 'scam' ? 'This one is a scam.' : 'This one is genuine.'}
          </p>
          <ol className="quiz-why">
            {item.marks.map((m, n) => <li key={n}><span className="quiz-num" aria-hidden>{n + 1}</span><span><strong>&quot;{m.quote}&quot;</strong> {m.why}</span></li>)}
          </ol>
          <p className="quiz-lesson">{item.lesson}</p>
          <button ref={nextRef} type="button" className="button button-outline" onClick={next}>{step + 1 === QUIZ.length ? 'See your score' : 'Next message'}</button>
        </div>
      )}
    </div>
  )
}
