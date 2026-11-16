type BackRouter = { back: () => void; push: (href: string) => void };

/** The Navigation API, where the engine has it. Its entries are only this origin's, so index 0 means the app has no page behind this one. */
type NavigationLike = { currentEntry?: { index: number } | null };

/**
 * Goes back when the page behind this one is in the app, and to `fallback` otherwise, so a deep link
 * opened on its own never leaves the app or does nothing. Without the Navigation API the tab's
 * history length stands in for it.
 */
export function backOr(router: BackRouter, fallback: string) {
  const navigation = (window as Window & { navigation?: NavigationLike }).navigation;
  const inApp = navigation?.currentEntry ? navigation.currentEntry.index > 0 : window.history.length > 1;
  if (inApp) router.back();
  else router.push(fallback);
}
