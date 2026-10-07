'use client'

import {useState, type PointerEvent} from 'react'
import {Arrow} from './Icons'

type Format = 'email' | 'pdf' | 'screenshot' | 'text'
const cases = [
  {id: 'email' as Format, label: 'Email', title: 'Your account needs attention', source: 'Account support', file: 'account-notice.eml', clues: [
    {phrase: 'verify within 2 hours', title: 'Pressure to act now', detail: 'A short deadline pushes you to click before you think.'},
    {phrase: 'account-restore.help', title: 'The address doesn’t match', detail: 'A convincing display name cannot prove who sent an email.'},
  ], action: 'Open the service’s app yourself. Check your account there.'},
  {id: 'pdf' as Format, label: 'PDF', title: 'Invoice BL-20461', source: 'Brook & Lane', file: 'invoice-october.pdf', clues: [
    {phrase: 'Our bank details have changed.', title: 'Payment redirected', detail: 'A sudden bank change is a common invoice fraud tactic.'},
    {phrase: 'Pay within 24 hours', title: 'A deadline that discourages checking', detail: 'Urgency makes it easier to miss the new payment details.'},
  ], action: 'Call the supplier using a number you already trust.'},
  {id: 'screenshot' as Format, label: 'Screenshot', title: 'We missed your delivery', source: 'Delivery notification', file: 'delivery-screenshot.png', clues: [
    {phrase: '£1.45 redelivery fee', title: 'A small payment opens the door', detail: 'A tiny fee can be bait for your card details.'},
    {phrase: 'evri-parcel.top', title: 'A familiar name. A different domain.', detail: 'Including a brand name does not make a link official.'},
  ], action: 'Track the parcel in the courier’s official app.'},
  {id: 'text' as Format, label: 'Message', title: 'Hi Mum, it’s me', source: 'Unknown number', file: 'copied-message.txt', clues: [
    {phrase: 'This is my new number.', title: 'An identity you haven’t verified', detail: 'The sender asks you to trust a new contact immediately.'},
    {phrase: 'transfer £480 today', title: 'A sudden request for money', detail: 'An urgent payment follows the claim to be someone you know.'},
  ], action: 'Call your family member on their usual number first.'},
]

function Document({index,marked}: {index:number;marked:boolean}) {
  const item=cases[index]
  const mark=(n:number)=><span className={marked?'revealed-mark':''}>{item.clues[n].phrase}<sup style={{visibility:marked?'visible':'hidden'}}>{n+1}</sup></span>
  return <div className={`reveal-layer ${marked?'layer-after':'layer-before'}`}>
    <div className="reveal-file"><span>{item.file}</span><span>{marked?'EVIDENCE EXPOSED':'AT FIRST GLANCE'} <span aria-hidden>↗</span></span></div>
    <div className="reveal-page-content"><div className="reveal-sender"><span>{item.source}</span><span>To you · 09:41</span></div><h3>{item.title}</h3>
      {item.id==='email'&&<><p>We’ve noticed unusual activity on your account. Please {mark(0)} to keep your access.</p><p className="reveal-cta">Review your account <span aria-hidden>↗</span></p><p className="reveal-address">{mark(1)}</p></>}
      {item.id==='pdf'&&<><div className="reveal-invoice"><span>Professional services<br />October invoice</span><strong>£1,280.00</strong></div><p>{mark(0)} Please use the new account below.</p><p>{mark(1)} to avoid a late fee.</p></>}
      {item.id==='screenshot'&&<><p>Your parcel is waiting at our depot. A {mark(0)} is required to arrange another delivery.</p><p className="reveal-address">{mark(1)}</p><p className="reveal-extracted">Extracted from the screenshot.</p></>}
      {item.id==='text'&&<><p>Hi Mum, my phone broke. {mark(0)}</p><p>Could you {mark(1)}? My banking app isn’t working. I’ll pay you back x</p></>}
    </div>
  </div>
}

export function EvidenceDemo() {
  const [selected,setSelected]=useState(0)
  const [reveal,setReveal]=useState(58)
  const item=cases[selected]
  function dragReveal(event:PointerEvent<HTMLDivElement>) {
    const rect=event.currentTarget.getBoundingClientRect()
    setReveal(Math.round(Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100))))
  }
  return <div className="reveal-experience">
    <div className="reveal-formats" role="group" aria-label="Choose an example format">{cases.map((c,i)=><button key={c.id} aria-pressed={i===selected} onClick={()=>setSelected(i)}>{c.label}</button>)}</div>
    <div className="reveal-paper" onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);dragReveal(event)}} onPointerMove={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId)) dragReveal(event)}} onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)}}><Document index={selected} marked={false}/><div className="reveal-mask" style={{clipPath:`inset(0 ${100-reveal}% 0 0)`}} aria-hidden><Document index={selected} marked /></div><div className="reveal-divider" data-edge={reveal===0||reveal===100} style={{left:`${reveal}%`}} aria-hidden><span>↔</span></div></div>
    <div className="reveal-control"><label htmlFor="reveal-evidence">Drag to reveal</label><input id="reveal-evidence" aria-valuetext={`${reveal}% revealed`} type="range" min="0" max="100" value={reveal} onChange={e=>setReveal(Number(e.target.value))}/><button type="button" className="reveal-toggle" onClick={()=>setReveal(reveal===100?0:100)}>{reveal===100?'Hide signs':'Show all signs'}</button></div>
    <div className="reveal-findings">{item.clues.map((clue,i)=><div key={clue.title}><span className="finding-index">0{i+1}</span><div><h4>{clue.title}</h4><p>{clue.detail}</p></div></div>)}</div>
    <div className="reveal-next"><span>NEXT STEP</span><p>{item.action}</p><Arrow className="h-5 w-5" /></div>
    <p className="illustration-note">Invented example. <a href="#check">Check your own message ↗</a></p>
  </div>
}
