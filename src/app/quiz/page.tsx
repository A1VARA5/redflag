import type {Metadata} from 'next'
import {PageHero} from '@/components/PageHero'
import {SpotTheScam} from '@/components/SpotTheScam'

export const metadata: Metadata = {
  title: 'Spot the scam · Red Flag',
  description: 'Five made up messages, some scams and some genuine. Make the call, then see the exact words that give each one away.',
  openGraph: {title: 'Spot the scam', description: 'Five messages. Some are scams. Would you have spotted them?'},
}

export default function QuizPage() {
  return (
    <main>
      <PageHero title="Spot the scam" />
      <div className="site-width pt-10 pb-6">
        <p className="quiz-intro">Five made up messages, written the way the real ones are. Some are scams, some are genuine. Make the call, then see what gives each one away.</p>
        <SpotTheScam />
      </div>
    </main>
  )
}
