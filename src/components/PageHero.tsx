// The supporting pages share the same content edge and type scale.
export function PageHero({kicker, title}: {kicker: string; title: string}) {
  return (
    <section className="hero">
      <div className="site-width">
        <div className="eyebrow">{kicker}</div>
        <h1 className="text-balance">{title}</h1>
      </div>
    </section>
  )
}
