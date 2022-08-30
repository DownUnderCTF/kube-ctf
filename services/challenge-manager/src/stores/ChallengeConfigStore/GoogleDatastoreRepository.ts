import {Datastore} from '@google-cloud/datastore';
import {Challenge} from '../../types/Challenge';
import {ChallengeConfigStoreRepository} from '.';
import NodeCache from 'node-cache';

const KIND = 'ctf-challenge-isolated';

export class GoogleDatastoreRepository
  implements ChallengeConfigStoreRepository
{
  constructor(private cache: NodeCache, private datastore: Datastore) {}

  async get(name: string): Promise<Challenge | null> {
    let chal: Challenge | null = this.cache.get(name) as unknown as Challenge;
    if (!chal) {
      chal = await this._get(name);
      this.cache.set(name, chal);
    }
    return chal;
  }

  private async _get(name: string) {
    const query = this.datastore
      .createQuery(KIND)
      .filter('__key__', this.datastore.key([KIND, name]))
      .limit(1);

    const [results] = await this.datastore.runQuery(query);
    if (results.length !== 1) return null;

    return {
      name,
      expires: results[0].expires,
      type: results[0].type,
      template: results[0].template,
      updated_at: results[0].updated_at,
      available_at: results[0].available_at,
    } as Challenge;
  }
}
