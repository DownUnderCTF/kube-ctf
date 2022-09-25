import {
  AppsV1Api,
  KubeConfig,
  KubernetesObjectApi,
} from '@kubernetes/client-node';
import {Challenge} from '../../types/Challenge';
import handlebars from 'handlebars';
import {apply, destroy, generateIdentifier} from './actions';
import {ISOLATED_CHALLENGE_QUALIFIER} from '../../strings';

export class DeploymentsStore {
  private apps: AppsV1Api;
  private objectApi: KubernetesObjectApi;

  constructor(
    cfg: KubeConfig,
    private apiDomain: string,
    private domain: string,
    private namespace: string,
    private registryPrefix: string,
    private secret: string
  ) {
    this.apps = cfg.makeApiClient(AppsV1Api);
    this.objectApi = KubernetesObjectApi.makeApiClient(cfg);
  }

  /**
   * Get all challenges associated with a particular owner
   *
   * @param ownerId Owner ID
   * @returns A list of deployments
   */
  async getDeploymentsByOwner(ownerId: string) {
    return (
      await this.apps.listNamespacedDeployment(
        this.namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `${ISOLATED_CHALLENGE_QUALIFIER}/owner=${ownerId}`
      )
    ).body.items;
  }

  async getDeploymentByNameAndOwner(name: string, ownerId: string) {
    const identifier = generateIdentifier(name, ownerId, this.secret);

    const items = (
      await this.apps.listNamespacedDeployment(
        this.namespace,
        undefined,
        undefined,
        undefined,
        `metadata.name=ctf-${identifier}`,
        undefined,
        1
      )
    ).body.items;
    if (items.length === 0) return null;
    return items[0];
  }

  /**
   * Deploys the challenge.
   * @param challenge Challenge spec
   * @param ownerId Owner ID
   * @returns A list of kubernetes objects
   */
  async deploy(challenge: Challenge, ownerId: string) {
    // Generate the template
    const spec = this.renderTemplate(challenge, ownerId);
    return await apply(spec, this.objectApi, {
      fieldManager: this.apiDomain,
    });
  }

  /**
   * Resets the state of the challenge by performing a rollout restart on the deployment
   * and updating the expiry on all the objects.
   *
   * @param challenge Challenge spec
   * @param ownerId Owner ID
   * @returns A list of kubernetes objects
   */
  async reset(challenge: Challenge, ownerId: string) {
    const spec = this.renderTemplate(challenge, ownerId);
    return await apply(spec, this.objectApi, {
      fieldManager: this.apiDomain,
      reset: true,
    });
  }

  /**
   * Extends the expiry of the challenge.
   *
   * @param challenge Challenge spec
   * @param ownerId Owner ID
   * @returns A list of kubernetes objects
   */
  async extend(challenge: Challenge, ownerId: string) {
    const spec = this.renderTemplate(challenge, ownerId);
    return await apply(spec, this.objectApi, {
      fieldManager: this.apiDomain,
      extend: true,
    });
  }

  /**
   * Destroys the challenge instance
   *
   * @param challenge Challenge spec
   * @param ownerId Owner ID
   * @returns A list of kubernetes objects
   */
  async destroy(challenge: Challenge, ownerId: string) {
    const spec = this.renderTemplate(challenge, ownerId);
    return await destroy(spec, this.objectApi);
  }

  private renderTemplate(challenge: Challenge, ownerId: string) {
    const tpl = handlebars.compile(challenge.template);
    const spec = tpl({
      deployment_id: generateIdentifier(challenge.name, ownerId, this.secret),
      challenge_name: challenge.name,
      registry_prefix: this.registryPrefix,
      owner_id: ownerId,
      domain: this.domain,
      expires:
        new Date(Date.now() + challenge.expires * 1000)
          .toISOString()
          .slice(0, -5) + 'Z',
    });
    return spec;
  }
}
