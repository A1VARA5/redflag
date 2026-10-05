// Small inline icons, drawn by hand so they match the line weight of the type.
type P = {className?: string}
const base = {fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const}

export const ShieldX = ({className}: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 2.8 4.5 5.6v5.6c0 4.7 3.1 8.6 7.5 10 4.4-1.4 7.5-5.3 7.5-10V5.6z" />
    <path d="m9.3 9.3 5.4 5.4m0-5.4-5.4 5.4" />
  </svg>
)
export const ShieldAlert = ({className}: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 2.8 4.5 5.6v5.6c0 4.7 3.1 8.6 7.5 10 4.4-1.4 7.5-5.3 7.5-10V5.6z" />
    <path d="M12 8v5" />
    <path d="M12 16.2h.01" />
  </svg>
)
export const ShieldCheck = ({className}: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 2.8 4.5 5.6v5.6c0 4.7 3.1 8.6 7.5 10 4.4-1.4 7.5-5.3 7.5-10V5.6z" />
    <path d="m8.8 12.2 2.3 2.3 4.3-4.6" />
  </svg>
)
export const ShieldQ = ({className}: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 2.8 4.5 5.6v5.6c0 4.7 3.1 8.6 7.5 10 4.4-1.4 7.5-5.3 7.5-10V5.6z" />
    <path d="M9.9 9.6a2.2 2.2 0 0 1 4.2.8c0 1.5-2.1 1.9-2.1 3.1" />
    <path d="M12 16.3h.01" />
  </svg>
)
export const Check = ({className}: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="m5 12.5 4.2 4.2L19 7" />
  </svg>
)
export const Link = ({className}: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
)
export const Image = ({className}: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m20.5 16-4.6-4.6L7 19.5" />
  </svg>
)
export const Mail = ({className}: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3.8 6.5 8.2 6 8.2-6" />
  </svg>
)
export const Chat = ({className}: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M20 12.5a7.5 7.5 0 0 1-11 6.6L4 20l1-4.4A7.5 7.5 0 1 1 20 12.5z" />
  </svg>
)
export const Lock = ({className}: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
)
export const Arrow = ({className}: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M5 12h14m-5-5 5 5-5 5" />
  </svg>
)
export const External = ({className}: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
)
export const Spinner = ({className}: P) => (
  <svg viewBox="0 0 24 24" className={`spin ${className ?? ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
)
