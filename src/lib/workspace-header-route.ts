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
    pathname === "/generate"
  );
}
