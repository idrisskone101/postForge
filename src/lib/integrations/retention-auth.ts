import { timingSafeEqual } from "node:crypto";

export function isRetentionCronAuthorized(
  request: Request,
  configuredSecret = process.env.CRON_SECRET
) {
  const secret = configuredSecret;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
