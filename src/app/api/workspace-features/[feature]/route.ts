import { NextRequest, NextResponse } from "next/server";
import {
  deleteWorkspaceFeatureRecord,
  isWorkspaceFeature,
  readWorkspaceFeatureRecords,
  updateWorkspaceFeatureRecords,
  upsertWorkspaceFeatureRecord,
  type WorkspaceFeature,
} from "@/lib/workspace-feature-store";
import {
  isModelAvailabilityState,
  MODEL_AVAILABILITY_RECORD_ID,
} from "@/lib/ai/model-availability";
import {
  createAutomationSchedulerState,
  isAutomationRecord,
  publicationIsUnresolved,
  type AutomationRecord,
} from "@/lib/automations";
import { isCharacterRecord } from "@/lib/characters";
import { isCollectionRecord } from "@/lib/collections";
import { isPromptTemplateRecord } from "@/lib/prompt-templates";
import { isSameOriginMutation } from "@/lib/http";
import { rejectCrossOriginMutation } from "@/lib/integrations/routes";

type StoredRecord = { id: string } & Record<string, unknown>;

class UnresolvedPublicationError extends Error {}

function isFiniteNullableNumber(value: unknown) {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isConnectionRecord(value: unknown): value is StoredRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.id === "workspace-settings") {
    return (
      typeof record.workspaceName === "string" &&
      typeof record.timezone === "string" &&
      typeof record.approvalDefault === "boolean" &&
      typeof record.emailFailures === "boolean" &&
      typeof record.emailApprovals === "boolean" &&
      typeof record.updatedAt === "string"
    );
  }
  if (record.id !== "performance-dataset") return false;
  if (
    record.source !== "csv" ||
    typeof record.accountLabel !== "string" ||
    typeof record.importedAt !== "string" ||
    !Array.isArray(record.posts)
  ) {
    return false;
  }
  return record.posts.every((post) => {
    if (!post || typeof post !== "object" || Array.isArray(post)) return false;
    const item = post as Record<string, unknown>;
    return (
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.views === "number" &&
      Number.isFinite(item.views) &&
      isFiniteNullableNumber(item.likes) &&
      isFiniteNullableNumber(item.comments) &&
      isFiniteNullableNumber(item.shares) &&
      isFiniteNullableNumber(item.saves) &&
      typeof item.publishedAt === "string"
    );
  });
}

function isWritableFeatureRecord(
  feature: WorkspaceFeature,
  value: unknown
): value is StoredRecord {
  switch (feature) {
    case "automations":
      return isAutomationRecord(value);
    case "characters":
      return isCharacterRecord(value);
    // Asset metadata is server-owned and can only be created by the upload route.
    case "collections":
      return isCollectionRecord(value);
    case "connections":
      return isConnectionRecord(value);
    case "models": {
      if (!isModelAvailabilityState(value)) return false;
      const record = value as unknown as StoredRecord;
      return record.id === MODEL_AVAILABILITY_RECORD_ID;
    }
    case "prompts":
      return isPromptTemplateRecord(value);
    default: {
      const exhaustive: never = feature;
      return exhaustive;
    }
  }
}

function invalidFeature() {
  return NextResponse.json({ error: "Unknown workspace feature" }, { status: 404 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ feature: string }> }
) {
  try {
    const { feature } = await params;
    if (!isWorkspaceFeature(feature)) return invalidFeature();
    return NextResponse.json({ records: await readWorkspaceFeatureRecords(feature) });
  } catch (error) {
    console.error("Failed to read workspace feature:", error);
    return NextResponse.json(
      { error: "Failed to load workspace data" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ feature: string }> }
) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();

  try {
    const { feature } = await params;
    if (!isWorkspaceFeature(feature)) return invalidFeature();
    const body = (await request.json()) as { record?: unknown };
    if (!isWritableFeatureRecord(feature, body.record)) {
      return NextResponse.json(
        { error: "record does not match this workspace feature" },
        { status: 400 }
      );
    }

    if (feature === "automations") {
      const requested = body.record as AutomationRecord;
      if (requested.status === "active" || requested.executionEnabled === true) {
        return NextResponse.json(
          { error: "Use the local schedule control to activate an automation" },
          { status: 409 }
        );
      }
      const records = await updateWorkspaceFeatureRecords<AutomationRecord>(
        "automations",
        (current) => {
          const existing = current.find(
            (candidate) =>
              candidate.id === requested.id && isAutomationRecord(candidate)
          );
          if (
            publicationIsUnresolved(existing?.publication) &&
            (requested.destination !== existing?.destination ||
              requested.accountId !== existing.accountId ||
              requested.content.sourceFileId !==
                existing.content.sourceFileId)
          ) {
            throw new UnresolvedPublicationError(
              "Destination, account, and asset cannot change while provider publishing is unresolved"
            );
          }
          const safePlan: AutomationRecord = {
            ...requested,
            executionEnabled: false,
            lastRunAt: existing?.lastRunAt ?? null,
            scheduler:
              existing?.scheduler ?? createAutomationSchedulerState(),
            publication: existing?.publication,
          };
          const index = current.findIndex(
            (candidate) => candidate.id === requested.id
          );
          if (index < 0) return [safePlan, ...current];
          return current.map((candidate, candidateIndex) =>
            candidateIndex === index ? safePlan : candidate
          );
        }
      );
      return NextResponse.json({ records });
    }

    const records = await upsertWorkspaceFeatureRecord(feature, body.record);
    return NextResponse.json({ records });
  } catch (error) {
    if (error instanceof UnresolvedPublicationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Failed to save workspace feature:", error);
    return NextResponse.json(
      { error: "Failed to save workspace data" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ feature: string }> }
) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();

  try {
    const { feature } = await params;
    if (!isWorkspaceFeature(feature)) return invalidFeature();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const records =
      feature === "automations"
        ? await updateWorkspaceFeatureRecords<AutomationRecord>(
            "automations",
            (current) => {
              const existing = current.find(
                (candidate) =>
                  candidate.id === id && isAutomationRecord(candidate)
              );
              if (publicationIsUnresolved(existing?.publication)) {
                throw new UnresolvedPublicationError(
                  "Resolve the provider publication before deleting this automation"
                );
              }
              return current.filter((record) => record.id !== id);
            }
          )
        : await deleteWorkspaceFeatureRecord(feature, id);
    return NextResponse.json({ records });
  } catch (error) {
    if (error instanceof UnresolvedPublicationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Failed to delete workspace feature:", error);
    return NextResponse.json(
      { error: "Failed to delete workspace data" },
      { status: 500 }
    );
  }
}
