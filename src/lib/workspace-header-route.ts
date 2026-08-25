export function routeOwnsHeader(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/ugc-clone" ||
    /^\/ugc-clone\/[^/]+$/.test(pathname) ||
    /^\/generate\/[^/]+$/.test(pathname) ||
    pathname === "/automations/new" ||
    pathname === "/characters/new"
  );
}

export function routeProvidesHeaderAccessory(pathname: string) {
  return (
    pathname === "/ugc-inspiration" ||
    pathname === "/gallery" ||
    pathname === "/generate" ||
    pathname === "/slideshow"
  );
}
