import {ChallengeConfigStoreRepository} from '.';
import {Challenge, KubeIsolatedChallenge} from '../../types/Challenge';
import {CustomObjectsApi, KubeConfig} from '@kubernetes/client-node';
import {API_GROUP} from '../../strings';
import NodeCache from 'node-cache';

export class KubernetesRepository implements ChallengeConfigStoreRepository {
  private customObjectsApi: CustomObjectsApi;

  constructor(private cache: NodeCache, cfg: KubeConfig) {
    this.customObjectsApi = cfg.makeApiClient(CustomObjectsApi);
  }

  async get(name: string): Promise<Challenge | null> {
    let chal: Challenge | null = this.cache.get(name) as unknown as Challenge;
    if (!chal) {
      chal = await this._get(name);
      this.cache.set(name, chal);
    }
    return chal;
  }

  private async _get(name: string): Promise<Challenge | null> {
    return this.customObjectsApi
      .getClusterCustomObject(API_GROUP, 'v1', 'isolated-challenges', name)
      .then(response => {
        const body = response.body as KubeIsolatedChallenge;
        return {
          name: body.metadata.name,
          expires: body.spec.expires,
          available_at: body.spec.available_at,
          template: body.spec.template,
          type: body.spec.type,
          updated_at: 0,
        };
      })
      .catch(e => {
        console.error(e.message);
        return null;
      });
  }
}
