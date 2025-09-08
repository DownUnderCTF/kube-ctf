import { ChallengeConfigStoreRepository } from ".";
import { Challenge } from "../../types/Challenge";
import { CustomObjectsApi, KubeConfig } from "@kubernetes/client-node";
import { API_GROUP } from "../../strings";
import SingleValueCache from "../../util/single_value_cache";

export class KubernetesRepository implements ChallengeConfigStoreRepository {
  private readonly customObjectsApi: CustomObjectsApi;
  private readonly cache = new SingleValueCache(() => this._getAll(), 60000);

  constructor(cfg: KubeConfig) {
    this.customObjectsApi = cfg.makeApiClient(CustomObjectsApi);
  }

  async get(name: string): Promise<Challenge | null> {
    let chal = (await this.cache.get()).get(name);
    return chal || null;
  }

  private async _getAll(): Promise<Map<string, Challenge>> {
    let results: { items: any[] };
    try {
      results = await this.customObjectsApi.listClusterCustomObject({
        group: API_GROUP,
        version: "v1",
        plural: "isolated-challenges",
      });
    } catch (e) {
      console.error("Failed to get all challenges", e);
      return new Map();
    }

    const list: Challenge[] = results.items.map((body: any) => ({
      name: body.metadata.name,
      expires: body.spec.expires,
      available_at: body.spec.available_at,
      template: body.spec.template,
      type: body.spec.type,
      updated_at: 0,
    }));
    return new Map(list.map((b) => [b.name, b]));
  }
}
