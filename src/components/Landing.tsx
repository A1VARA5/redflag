// The three step process shown on the home page and the How it works page.
import {Link as LinkIcon, Lock, ShieldCheck} from './Icons'

const STEPS = [
  {icon: <Lock className="h-5 w-5" />, title: 'Unpack the message.', body: 'Extract PDF text, read QR codes and uncover hidden characters or instructions buried in an email.'},
  {icon: <LinkIcon className="h-5 w-5" />, title: 'Check where it leads.', body: 'Compare links with threat databases, domain history and real brand websites. Check lookalikes and redirects too.'},
  {icon: <ShieldCheck className="h-5 w-5" />, title: 'Know your next step.', body: 'See the warning signs and what to do next, with the evidence behind the result. If we’re unsure, we say so.'},
]

export function Pipeline() {
  return (
    <div className="pipeline">
      <ol>
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <div className="pipeline-head">
              <span className="pipeline-icon" aria-hidden>{step.icon}</span>
              <span className="pipeline-number" aria-hidden>0{index + 1}</span>
            </div>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
