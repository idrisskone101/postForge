import { noStoreJson } from "../http";

export function rejectCrossOriginMutation() {
  return noStoreJson(
    { error: "Same-origin request required" },
    { status: 403 }
  );
}
