import { NextRequest, NextResponse } from "next/server";
import {
  clearProviderCredential,
  getStoredProviderCredential,
  PROVIDER_CREDENTIALS,
  PROVIDER_ENV_KEYS,
  saveProviderCredential,
  type ProviderCredentialId,
} from "@/lib/providers/credentials";
import { isSameOriginMutation } from "@/lib/http";
import { rejectCrossOriginMutation } from "@/lib/integrations/routes";

function isProviderCredentialId(value: unknown): value is ProviderCredentialId {
  return (
    typeof value === "string" &&
    (PROVIDER_CREDENTIALS as readonly string[]).includes(value)
  );
}

export async function GET() {
  try {
    const statuses = await Promise.all(
      PROVIDER_CREDENTIALS.map(async (provider) => {
        const stored = (await getStoredProviderCredential(provider)) !== null;
        const envConfigured = Boolean(
          process.env[PROVIDER_ENV_KEYS[provider]]?.trim()
        );
        return {
          provider,
          configured: stored || envConfigured,
          source: stored ? ("stored" as const) : envConfigured ? ("env" as const) : ("none" as const),
          envKey: PROVIDER_ENV_KEYS[provider],
        };
      })
    );
    return NextResponse.json({ providers: statuses });
  } catch (error) {
    console.error("Failed to read provider credentials:", error);
    return NextResponse.json(
      { error: "Failed to load provider credential status" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();

  try {
    const body = (await request.json()) as { provider?: unknown; value?: unknown };
    if (!isProviderCredentialId(body.provider)) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }
    if (typeof body.value !== "string" || !body.value.trim()) {
      return NextResponse.json(
        { error: "value is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    await saveProviderCredential(body.provider, body.value);
    return NextResponse.json({
      provider: body.provider,
      configured: true,
      source: "stored",
    });
  } catch (error) {
    console.error("Failed to save provider credential:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save provider credential",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();

  try {
    const { searchParams } = request.nextUrl;
    const provider = searchParams.get("provider");
    if (!isProviderCredentialId(provider)) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    await clearProviderCredential(provider);
    const envConfigured = Boolean(
      process.env[PROVIDER_ENV_KEYS[provider]]?.trim()
    );
    return NextResponse.json({
      provider,
      configured: envConfigured,
      source: envConfigured ? "env" : "none",
    });
  } catch (error) {
    console.error("Failed to clear provider credential:", error);
    return NextResponse.json(
      { error: "Failed to clear provider credential" },
      { status: 500 }
    );
  }
}
