import {Datastore} from '@google-cloud/datastore';
import {Challenge} from '../../types/Challenge';
import {ChallengeConfigStoreRepository} from '.';

const KIND = 'ctf-challenge-isolated';

export interface GoogleDatastoreRepositoryParams {
  googleDatastore: Datastore;
}

export class GoogleDatastoreRepository
  implements ChallengeConfigStoreRepository
{
  private datastore: Datastore;

  constructor({googleDatastore}: GoogleDatastoreRepositoryParams) {
    this.datastore = googleDatastore;
  }

  async get(name: string): Promise<Challenge | null> {
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
