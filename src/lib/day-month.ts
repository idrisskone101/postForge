/** The one date voice for provider data: "9 Nov" and "9 Nov, 10:40" in every locale. */
export const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
export const dayMonthTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
