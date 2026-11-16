export function routeOwnsHeader(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/gallery" ||
    pathname === "/ugc-clone" ||
    /^\/ugc-clone\/[^/]+$/.test(pathname) ||
    /^\/generate\/[^/]+$/.test(pathname) ||
    pathname === "/slideshow" ||
    pathname === "/automations/new" ||
    pathname === "/characters/new"
  );
}

export function routeProvidesHeaderAccessory(pathname: string) {
  return (
    pathname === "/ugc-inspiration" ||
    pathname === "/gallery" ||
    pathname === "/generate" ||
    pathname === "/collections" ||
    pathname === "/performance" ||
    pathname === "/costs"
  );
}

/**
 * Routes whose shared-header actions cannot sit beside the title on a small screen. The value is the
 * width below which the header is two declared rows (PageHeader `stackBelow`).
 */
export function routeHeaderStackBelow(pathname: string): 360 | 480 | 640 | undefined {
  if (pathname === "/ugc-inspiration" || pathname === "/collections") return 640;
  if (pathname === "/characters") return 360;
  return undefined;
}
