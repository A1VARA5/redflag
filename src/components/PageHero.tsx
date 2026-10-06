// The navy band at the top of the inner pages, so every page opens the same way as the home page.
export function PageHero({kicker, title, width = 'max-w-6xl'}: {kicker: string; title: string; width?: string}) {
  return (
    <section className="hero">
      <div className={`mx-auto w-full ${width} px-4 pt-12 pb-14 sm:px-6 sm:pt-16 sm:pb-16`}>
        <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#ff8a80]">{kicker}</div>
        <h1 className="mt-2 text-balance text-[36px] font-bold leading-tight tracking-tight text-white sm:text-[48px]">{title}</h1>
      </div>
    </section>
  )
}
