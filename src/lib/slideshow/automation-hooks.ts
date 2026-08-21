export function selectSlideshowAutomationHook(options: {
  automationId: string;
  scheduledFor: Date;
  hooks: string[];
  usedHooks: string[];
  preventRepeats: boolean;
}) {
  const hooks = options.hooks
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 500);
  const validHooks = new Set(hooks);
  const usedHooks = options.preventRepeats
    ? options.usedHooks
        .filter((hook, index, all) => validHooks.has(hook) && all.indexOf(hook) === index)
        .slice(-500)
    : [];
  const unusedHooks = hooks.filter((hook) => !usedHooks.includes(hook));
  const previousHook = usedHooks.at(-1);
  const eligibleHooks = unusedHooks.length
    ? unusedHooks
    : hooks.length > 1 && previousHook
      ? hooks.filter((hook) => hook !== previousHook)
      : hooks;
  const selectedHook = eligibleHooks.length
    ? eligibleHooks[
        hash(`${options.automationId}:${options.scheduledFor.toISOString()}`) %
          eligibleHooks.length
      ]
    : undefined;

  if (!options.preventRepeats || !selectedHook) return { selectedHook };
  return {
    selectedHook,
    nextUsedHooks: [
      ...(unusedHooks.length ? usedHooks : []),
      selectedHook,
    ].slice(-500),
  };
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function hookPool(settings: Record<string, unknown>) {
  const source = settings.hookPool ?? settings.hooks ?? settings.hookList;
  const values = Array.isArray(source)
    ? source
    : typeof source === "string"
      ? source.split(/\r?\n/)
      : [];
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 500);
}

export function usedHookPool(settings: Record<string, unknown>, hooks: string[]) {
  const used = Array.isArray(settings.usedHooks)
    ? settings.usedHooks
    : Array.isArray(settings.usedHookHistory)
      ? settings.usedHookHistory
      : [];
  const validHooks = new Set(hooks);
  return used
    .filter((value): value is string => typeof value === "string")
    .filter(
      (value, index, all) =>
        validHooks.has(value) && all.indexOf(value) === index,
    )
    .slice(-500);
}
