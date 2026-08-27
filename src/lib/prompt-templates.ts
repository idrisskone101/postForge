import {
  builtinBeforeIdentityTemplate,
  BEFORE_IDENTITY_TEMPLATE_ID,
} from "@/lib/ugc/before-identity-prompt";

export const PROMPT_TEMPLATE_FEATURE = "prompt-templates" as const;

export const PROMPT_TEMPLATE_NAME_MAX_LENGTH = 80;
export const PROMPT_TEMPLATE_PROMPT_MAX_LENGTH = 1500;

export type PromptTemplateRecord = {
  id: string;
  kind: "prompt-template";
  name: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
};

export function isPromptTemplateRecord(
  value: unknown
): value is PromptTemplateRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<PromptTemplateRecord>;
  return (
    record.kind === "prompt-template" &&
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.name === "string" &&
    record.name.trim().length > 0 &&
    record.name.trim().length <= PROMPT_TEMPLATE_NAME_MAX_LENGTH &&
    typeof record.prompt === "string" &&
    record.prompt.trim().length > 0 &&
    record.prompt.length <= PROMPT_TEMPLATE_PROMPT_MAX_LENGTH &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

export function createPromptTemplate({
  name,
  prompt,
  now,
  id,
  createdAt,
}: {
  name: string;
  prompt: string;
  now: Date;
  id?: string;
  createdAt?: string;
}): PromptTemplateRecord {
  const trimmedName = name.trim();
  const trimmedPrompt = prompt.trim();
  if (!trimmedName) {
    throw new Error("Template name is required.");
  }
  if (trimmedName.length > PROMPT_TEMPLATE_NAME_MAX_LENGTH) {
    throw new Error(
      `Template name must be ${PROMPT_TEMPLATE_NAME_MAX_LENGTH} characters or fewer.`
    );
  }
  if (!trimmedPrompt) {
    throw new Error("Prompt text is required.");
  }

  const timestamp = now.toISOString();
  return {
    id: id ?? crypto.randomUUID(),
    kind: "prompt-template",
    name: trimmedName,
    prompt: trimmedPrompt.slice(0, PROMPT_TEMPLATE_PROMPT_MAX_LENGTH),
    createdAt: createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function sortPromptTemplates(
  records: readonly PromptTemplateRecord[]
): PromptTemplateRecord[] {
  return [...records].sort((left, right) => {
    const byUpdatedAt = right.updatedAt.localeCompare(left.updatedAt);
    if (byUpdatedAt !== 0) return byUpdatedAt;
    return left.name.localeCompare(right.name);
  });
}

export function parsePromptTemplateRecords(
  values: readonly unknown[]
): PromptTemplateRecord[] {
  return sortPromptTemplates(
    withBuiltinPromptTemplates(values.filter(isPromptTemplateRecord))
  );
}

export function withBuiltinPromptTemplates(
  records: readonly PromptTemplateRecord[]
): PromptTemplateRecord[] {
  if (records.some((record) => record.id === BEFORE_IDENTITY_TEMPLATE_ID)) {
    return [...records];
  }
  return [builtinBeforeIdentityTemplate(), ...records];
}

export function truncatePromptPreview(prompt: string, maxLength = 96) {
  const normalized = prompt.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
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
    return createPromptTemplate({
      name,
      prompt,
      now,
      id: existing.id,
      createdAt: existing.createdAt,
    });
  }
  return createPromptTemplate({ name, prompt, now });
}
