// The supporting pages share the same content edge and type scale.
export function PageHero({title}: {title: string}) {
  return (
    <section className="hero">
      <div className="site-width">
        <h1 className="text-balance">{title}</h1>
      </div>
    </section>
  )
}
