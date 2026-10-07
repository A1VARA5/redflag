// "Spot the scam": made up messages, some scams and some genuine, each with the parts worth a second look.
// Phone numbers use the Ofcom drama range and the domains are invented, so nothing here points anywhere real.
export type QuizItem = {
  id: string
  kind: 'scam' | 'real'
  channel: 'Text' | 'WhatsApp' | 'Email' | 'Discord'
  from: string
  body: string
  marks: {quote: string; why: string}[]
  lesson: string
}

export const QUIZ: QuizItem[] = [
  {
    id: 'parcel',
    kind: 'scam',
    channel: 'Text',
    from: 'EVRi',
    body: 'EVRi: We missed you today. Your parcel is held at our depot. Reschedule delivery (£1.20 fee) at evri-redelivery-uk.com within 12 hours or it will be returned to sender.',
    marks: [
      {quote: '£1.20 fee', why: 'A tiny fee is the bait. The real goal is your full card details.'},
      {quote: 'evri-redelivery-uk.com', why: "Evri's real site is evri.com. This one just borrows the name."},
      {quote: 'within 12 hours', why: 'A deadline is there to stop you thinking it through.'},
    ],
    lesson: "Couriers don't text you a link to pay a redelivery fee. If you're expecting something, open the courier's app or type their address yourself.",
  },
  {
    id: 'surgery',
    kind: 'real',
    channel: 'Text',
    from: 'Riverside Surgery',
    body: "Riverside Surgery: Reminder of your flu jab on Thu 15 Oct at 10:40. If you can't make it, please call the surgery on the number on our website. Reply STOP to opt out.",
    marks: [
      {quote: 'call the surgery on the number on our website', why: "It sends you to a number you find yourself, not one in the message."},
    ],
    lesson: 'No link, no money, nothing to log in to. It only tells you where to be. That is what a normal reminder looks like.',
  },
  {
    id: 'mum',
    kind: 'scam',
    channel: 'WhatsApp',
    from: '+44 7700 900417',
    body: "Hi Mum, it's me, this is my new number, my old phone fell in the sink 🙈 can you message me back on here? Need to ask you something x",
    marks: [
      {quote: 'this is my new number', why: 'The opening line of the "Hi Mum" scam. A new number means you can\'t check who it is.'},
      {quote: 'can you message me back on here', why: 'It moves the chat to a number the scammer controls. A request for money usually comes next.'},
      {quote: 'Need to ask you something', why: "Vague on purpose. It never says a name that would give it away."},
    ],
    lesson: "Call your child on the number you already have before replying. If it's really them, they won't mind.",
  },
  {
    id: 'bank',
    kind: 'real',
    channel: 'Text',
    from: 'Barclays',
    body: "Barclays: Did you try to pay £84.99 to SPORTSDIRECT on 07 Oct? Reply Y if this was you or N if not. We'll never ask you for your PIN, passcode or to move money.",
    marks: [
      {quote: 'Reply Y if this was you or N if not', why: 'Real fraud checks ask for a one letter reply. There is no link and no number to call.'},
      {quote: "We'll never ask you for your PIN, passcode or to move money", why: 'That is the rule every UK bank follows. A scam would end up asking for exactly these.'},
    ],
    lesson: "Banks really do send these. If you're unsure, ignore the text and check the payment in your banking app.",
  },
  {
    id: 'nitro',
    kind: 'scam',
    channel: 'Discord',
    from: 'steam_gifts_bot',
    body: 'Free Discord Nitro for 3 months, gifted by Steam 🎁 Only 200 left today! Log in with Discord to claim: dlscord-gifts.com/nitro',
    marks: [
      {quote: 'Free Discord Nitro for 3 months, gifted by Steam', why: "Steam doesn't hand out Discord Nitro to strangers."},
      {quote: 'Only 200 left today!', why: 'Fake scarcity, to make you click before you look.'},
      {quote: 'dlscord-gifts.com', why: 'Look closely: "dlscord" with an L. A fake login page that steals your account.'},
    ],
    lesson: "Gifts come through Discord's own gift button, never a link to log in somewhere else.",
  },
]
