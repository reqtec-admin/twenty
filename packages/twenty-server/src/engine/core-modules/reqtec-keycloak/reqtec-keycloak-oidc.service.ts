import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

type OidcDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  issuer: string;
};

export type KeycloakProfile = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  picture?: string | null;
  subject: string;
};

@Injectable()
export class ReqtecKeycloakOidcService {
  private readonly logger = new Logger(ReqtecKeycloakOidcService.name);
  private discoveryCache: OidcDiscovery | null = null;

  isEnabled(): boolean {
    return this.readEnv('AUTH_KEYCLOAK_ENABLED') === 'true';
  }

  getIssuer(): string {
    return this.requireEnv('AUTH_KEYCLOAK_ISSUER').replace(/\/$/, '');
  }

  getClientId(): string {
    return this.requireEnv('AUTH_KEYCLOAK_CLIENT_ID');
  }

  getClientSecret(): string {
    return this.requireEnv('AUTH_KEYCLOAK_CLIENT_SECRET');
  }

  getCallbackUrl(): string {
    return this.requireEnv('AUTH_KEYCLOAK_CALLBACK_URL');
  }

  getScope(): string {
    return this.readEnv('AUTH_KEYCLOAK_SCOPE') || 'openid email profile';
  }

  allowJit(): boolean {
    return this.readEnv('AUTH_KEYCLOAK_ALLOW_JIT') === 'true';
  }

  createPkce(): { verifier: string; challenge: string } {
    const verifier = this.base64Url(randomBytes(32));
    const challenge = this.base64Url(
      createHash('sha256').update(verifier).digest(),
    );

    return { verifier, challenge };
  }

  createState(): string {
    return this.base64Url(randomBytes(24));
  }

  async buildAuthorizationUrl(params: {
    state: string;
    codeChallenge: string;
    workspaceId?: string;
    returnToPath?: string;
  }): Promise<string> {
    const discovery = await this.discover();
    const url = new URL(discovery.authorization_endpoint);

    url.searchParams.set('client_id', this.getClientId());
    url.searchParams.set('redirect_uri', this.getCallbackUrl());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', this.getScope());
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return url.toString();
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<KeycloakProfile> {
    const discovery = await this.discover();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.getCallbackUrl(),
      client_id: this.getClientId(),
      client_secret: this.getClientSecret(),
      code_verifier: codeVerifier,
    });

    const tokenResponse = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body,
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      this.logger.error(`Keycloak token error: ${tokenResponse.status} ${text}`);
      throw new Error('Failed to exchange Keycloak authorization code');
    }

    const tokens = (await tokenResponse.json()) as {
      access_token?: string;
    };

    if (!tokens.access_token) {
      throw new Error('Keycloak token response missing access_token');
    }

    const userinfoResponse = await fetch(discovery.userinfo_endpoint, {
      headers: {
        authorization: `Bearer ${tokens.access_token}`,
        accept: 'application/json',
      },
    });

    if (!userinfoResponse.ok) {
      const text = await userinfoResponse.text();
      this.logger.error(`Keycloak userinfo error: ${userinfoResponse.status} ${text}`);
      throw new Error('Failed to load Keycloak userinfo');
    }

    const claims = (await userinfoResponse.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
      name?: string;
      picture?: string;
    };

    const email = claims.email?.trim().toLowerCase();

    if (!email) {
      throw new Error('Keycloak userinfo did not include email');
    }

    return {
      email,
      firstName: claims.given_name ?? claims.name ?? null,
      lastName: claims.family_name ?? null,
      picture: claims.picture ?? null,
      subject: claims.sub ?? email,
    };
  }

  private async discover(): Promise<OidcDiscovery> {
    if (this.discoveryCache) {
      return this.discoveryCache;
    }

    const url = `${this.getIssuer()}/.well-known/openid-configuration`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Keycloak discovery failed at ${url}`);
    }

    this.discoveryCache = (await response.json()) as OidcDiscovery;

    return this.discoveryCache;
  }

  private readEnv(name: string): string | undefined {
    const value = process.env[name];
    return value && value.length > 0 ? value : undefined;
  }

  private requireEnv(name: string): string {
    const value = this.readEnv(name);

    if (!value) {
      throw new Error(`${name} is not set`);
    }

    return value;
  }

  private base64Url(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
}
