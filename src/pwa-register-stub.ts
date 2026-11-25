/** Stands in for `virtual:pwa-register` in the Artifact build, which has no service worker. */
export function registerSW(): (reload?: boolean) => Promise<void> {
  return async () => {};
}
