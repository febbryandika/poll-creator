import { useSyncExternalStore } from 'react'

// False during SSR and the hydration render, true afterwards. The hydration-safe way
// to gate on browser-only APIs (window / localStorage) without a setState-in-effect.
const subscribe = () => () => {}

export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
