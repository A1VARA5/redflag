// The hero flag answers the checker: it drops halfway while a message is being checked, goes up in a stiff wind
// for a scam, and comes down limp when the message looks fine. Kept apart from FlagScene so the checker doesn't
// pull the WebGL code into phones that never draw the flag.
export const FLAG_EVENT = 'redflag:state'
export type FlagState = 'idle' | 'checking' | 'scam' | 'suspicious' | 'unclear' | 'safe'
export const flagState = (state: FlagState) => window.dispatchEvent(new CustomEvent(FLAG_EVENT, {detail: state}))
