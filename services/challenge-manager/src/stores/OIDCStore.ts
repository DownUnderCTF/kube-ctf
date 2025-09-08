import { NonRetryableError } from "../error";
import { retryWithBackoff } from "../util/retry";
import { createRemoteJWKSet } from "jose";

export type OIDCConfig = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  id_token_signing_alg_values_supported: string[];
};

export class OIDCStore {
  private config: OIDCConfig | undefined;
  private jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

  constructor(
    private readonly configURL: string,
    private readonly clientID: string,
  ) {
    if (configURL && clientID) {
      this.init();
    }
  }

  isReady() {
    return !this.configURL || !!this.config;
  }

  getJWKs() {
    if (this.jwks) {
      return this.jwks;
    }
    return null;
  }

  getRemoteConfig() {
    return this.config;
  }

  getClientID() {
    if (!this.clientID) throw new Error("Service unavailable");
    return this.clientID;
  }

  private async init() {
    const loop = async () => {
      const url = new URL(".well-known/openid-configuration", this.configURL);
      const data = await fetch(url, { redirect: "follow" });
      if (!data.ok) {
        if (Math.floor(data.status / 100) === 5) {
          throw new Error("Error retrieving JWK config");
        }
        throw new NonRetryableError("Could not fetch JWKs");
      }
      const json = await data.json();
      this.config = json;
      this.jwks = createRemoteJWKSet(new URL(this.config!.jwks_uri));
    };
    await retryWithBackoff(loop, {
      maximumDelay: 30000,
      maxRetries: 5,
    });
  }
}
