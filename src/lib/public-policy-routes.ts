export const PUBLIC_POLICY_PATHS = [
  "/privacy",
  "/terms",
  "/data-deletion",
] as const;

export function isPublicPolicyPath(pathname: string) {
  return (PUBLIC_POLICY_PATHS as readonly string[]).includes(pathname);
}
