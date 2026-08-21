import {
  IntegrationAccountBindingError,
  IntegrationAuthorizationUnhealthyError,
  IntegrationMutationSupersededError,
  IntegrationNotConfiguredError,
  IntegrationNotConnectedError,
  IntegrationPublishScopeError,
  YouTubePolicyConsentRequiredError,
} from "@/lib/integrations/service";
import {
  IntegrationMediaValidationError,
  IntegrationPublicationAmbiguousError,
  IntegrationPublicationTerminalError,
} from "@/lib/integrations/publishing";
import { IntegrationProviderError } from "@/lib/integrations/providers/http";
import { AutomationPublicationClaimError } from "./publication-claim-error";

export function publishingError(cause: unknown): {
  message: string;
  statusCode: number;
} {
  if (cause instanceof AutomationPublicationClaimError) {
    return { message: cause.message, statusCode: cause.statusCode };
  }
  if (cause instanceof IntegrationMediaValidationError) {
    return { message: cause.message, statusCode: 422 };
  }
  if (cause instanceof IntegrationPublicationTerminalError) {
    return { message: cause.message, statusCode: 422 };
  }
  if (cause instanceof IntegrationPublicationAmbiguousError) {
    return { message: cause.message, statusCode: 502 };
  }
  if (cause instanceof IntegrationNotConfiguredError) {
    return {
      message: "This provider is not configured for server publishing",
      statusCode: 503,
    };
  }
  if (cause instanceof IntegrationNotConnectedError) {
    return {
      message: "Connect this provider in Settings before publishing",
      statusCode: 409,
    };
  }
  if (cause instanceof IntegrationAuthorizationUnhealthyError) {
    return {
      message: "Reconnect this provider before publishing",
      statusCode: 409,
    };
  }
  if (cause instanceof IntegrationPublishScopeError) {
    return {
      message: "Reconnect this account and grant its publishing permission",
      statusCode: 409,
    };
  }
  if (cause instanceof YouTubePolicyConsentRequiredError) {
    return {
      message: cause.message,
      statusCode: 428,
    };
  }
  if (cause instanceof IntegrationAccountBindingError) {
    return {
      message: "The connected account changed; review the destination again",
      statusCode: 409,
    };
  }
  if (cause instanceof IntegrationMutationSupersededError) {
    return {
      message: "A newer connection change superseded this request; try again",
      statusCode: 409,
    };
  }
  if (cause instanceof IntegrationProviderError) {
    return {
      message:
        cause.status === null
          ? `${cause.message}; the provider did not confirm completion. Verify the destination before retrying.`
          : `${cause.message} (provider HTTP ${cause.status}). Nothing else will be sent automatically.`,
      statusCode: 502,
    };
  }
  return {
    message: "Provider publishing failed; nothing else will be sent automatically",
    statusCode: 500,
  };
}
