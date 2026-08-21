export class IntegrationNotConfiguredError extends Error {
  constructor() {
    super("This integration is not configured");
    this.name = "IntegrationNotConfiguredError";
  }
}

export class IntegrationNotConnectedError extends Error {
  constructor() {
    super("This integration is not connected");
    this.name = "IntegrationNotConnectedError";
  }
}

export class IntegrationSyncError extends Error {
  constructor() {
    super("The integration could not be synced");
    this.name = "IntegrationSyncError";
  }
}

export class IntegrationDisconnectError extends Error {
  constructor() {
    super(
      "The provider did not confirm revocation; the local connection was retained so disconnect can be retried"
    );
    this.name = "IntegrationDisconnectError";
  }
}

export class IntegrationMutationSupersededError extends Error {
  constructor() {
    super("A newer integration change superseded this request");
    this.name = "IntegrationMutationSupersededError";
  }
}

export class IntegrationAuthorizationUnhealthyError extends Error {
  constructor() {
    super("Provider authorization must be healthy before publishing");
    this.name = "IntegrationAuthorizationUnhealthyError";
  }
}

export class IntegrationPublishScopeError extends Error {
  constructor() {
    super("The connected account has not granted the provider publishing scope");
    this.name = "IntegrationPublishScopeError";
  }
}

export class IntegrationAccountBindingError extends Error {
  constructor() {
    super("The connected provider account no longer matches this automation");
    this.name = "IntegrationAccountBindingError";
  }
}

export class YouTubePolicyConsentRequiredError extends Error {
  constructor() {
    super(
      "Review and accept the configured PostForge policies and YouTube Terms of Service, then reconnect YouTube"
    );
    this.name = "YouTubePolicyConsentRequiredError";
  }
}
