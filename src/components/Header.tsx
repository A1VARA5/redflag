import {Logo} from './Flag'

const DISCORD = `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_APPLICATION_ID ?? '1556639934457184256'}`

export function Header() {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 text-[15px] text-ink-2 sm:gap-2">
          <a href="/radar" className="rounded-md px-2.5 py-1.5 hover:bg-muted-bg hover:text-ink">This week</a>
          <a href="/how" className="hidden rounded-md px-2.5 py-1.5 hover:bg-muted-bg hover:text-ink sm:block">How it works</a>
          <a href="/eval" className="hidden rounded-md px-2.5 py-1.5 hover:bg-muted-bg hover:text-ink md:block">Test results</a>
          <a href={DISCORD} target="_blank" rel="noreferrer" className="ml-1 hidden rounded-lg border border-line-2 px-3 py-1.5 font-medium text-ink hover:border-ink sm:block">
            Add to Discord
          </a>
        </nav>
      </div>
    </header>
  )
}
