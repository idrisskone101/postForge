export const PROMPT_TEMPLATE_FEATURE = "prompts";
export const PROMPT_TEMPLATE_MAX_LENGTH = 1500;

export type PromptTemplateRecord = {
  id: string;
  kind: "prompt-template";
  name: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
};

export function isPromptTemplateRecord(value: unknown): value is PromptTemplateRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<PromptTemplateRecord>;
  return (
    record.kind === "prompt-template" &&
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.name === "string" &&
    record.name.trim().length > 0 &&
    typeof record.prompt === "string" &&
    record.prompt.trim().length > 0 &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

export function createPromptTemplate({
  name,
  prompt,
  now,
  id,
}: {
  name: string;
  prompt: string;
  now: Date;
  id?: string;
}): PromptTemplateRecord {
  const trimmedName = name.trim();
  const trimmedPrompt = prompt.trim();
  if (!trimmedName) {
    throw new Error("Template name is required.");
  }
  if (!trimmedPrompt) {
    throw new Error("Prompt text is required.");
  }

  const timestamp = now.toISOString();
  return {
    id: id ?? crypto.randomUUID(),
    kind: "prompt-template",
    name: trimmedName,
    prompt: trimmedPrompt.slice(0, PROMPT_TEMPLATE_MAX_LENGTH),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function promptTemplateToSave(
  records: readonly PromptTemplateRecord[],
  { name, prompt }: { name: string; prompt: string },
  now: Date
): PromptTemplateRecord {
  const normalizedName = name.trim().toLowerCase();
  const existing = records.find(
    (record) => record.name.trim().toLowerCase() === normalizedName
  );
  if (existing) {
    const updated = createPromptTemplate({
      name,
      prompt,
      now,
      id: existing.id,
    });
    return {
      ...updated,
      createdAt: existing.createdAt,
    };
  }
  return createPromptTemplate({ name, prompt, now });
}
