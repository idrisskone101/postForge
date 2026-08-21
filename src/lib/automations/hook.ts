function compactHookTopic(prompt: string) {
  const firstThought = prompt
    .trim()
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)[0]
    ?.replace(/[.!?]+$/g, "")
    .replace(
      /^(?:write|create|open|start|lead|focus|show|explain|share|tell|use)\s+(?:with\s+)?/i,
      ""
    )
    .trim();
  if (!firstThought) return "";
  return firstThought.split(" ").slice(0, 9).join(" ");
}

function lowercaseLead(value: string) {
  return value.length > 0 ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
}

function uppercaseLead(value: string) {
  return value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

/**
 * Compose a deterministic hook locally from the editor's two explicit inputs.
 * This is prompt composition, not an AI or network-backed generation claim.
 */
export function composeAutomationHook(strategy: string, prompt: string) {
  const topic = compactHookTopic(prompt);
  if (!topic) return "";

  switch (strategy) {
    case "Curiosity gap":
      return `What nobody tells you about ${lowercaseLead(topic)}`;
    case "Unexpected result":
      return `${uppercaseLead(topic)} — then this happened`;
    case "Contrarian truth":
      return `The usual advice on ${lowercaseLead(topic)} is wrong`;
    case "Specific transformation":
      return `How ${lowercaseLead(topic)} changed the outcome`;
    case "Concrete promise":
      return `${uppercaseLead(topic)}: the practical steps`;
    default:
      return `${strategy.trim() || "Hook"}: ${topic}`;
  }
}
