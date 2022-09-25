import crypto from 'crypto';
import {
  KubernetesObjectApi,
  KubernetesObject,
  PatchUtils,
} from '@kubernetes/client-node';
import yaml from 'js-yaml';

const HMAC_ALGORITHM = 'sha256';
const RAND_LENGTH = 16;

/**
 * Generate a identifier for deployments by an owner.
 *
 * @param name Challenge name
 * @param teamId Team ID
 * @param secret A secret used to sign the HMAC
 * @returns A challenge identifier
 */
export function generateIdentifier(
  name: string,
  teamId: string,
  secret: string
) {
  const hmac = crypto.createHmac(HMAC_ALGORITHM, secret);
  hmac.update(JSON.stringify([name, teamId]));
  return `${name}-${hmac.digest('hex').substring(0, RAND_LENGTH)}`;
}

/**
 * Replicate the functionality of `kubectl apply`.  That is, create the resources defined in the `specFile` if they do
 * not exist, patch them if they do exist.
 *
 * @param specPath File system path to a YAML Kubernetes spec.
 * @return Array of resources created
 */
interface ApplyOptions {
  fieldManager?: string;
  extend?: boolean;
  reset?: boolean;
}
export async function apply(
  specString: string,
  client: KubernetesObjectApi,
  {fieldManager, extend, reset}: ApplyOptions
): Promise<KubernetesObject[]> {
  const specs: KubernetesObject[] = yaml.loadAll(
    specString
  ) as KubernetesObject[];
  const validSpecs = specs.filter(s => s && s.kind && s.metadata);
  const created: KubernetesObject[] = [];
  for (const spec of validSpecs) {
    // this is to convince the old version of TypeScript that metadata exists even though we already filtered specs
    // without metadata out
    spec.metadata = spec.metadata || {};
    spec.metadata.annotations = spec.metadata.annotations || {};
    delete spec.metadata.annotations[
      'kubectl.kubernetes.io/last-applied-configuration'
    ];
    spec.metadata.annotations[
      'kubectl.kubernetes.io/last-applied-configuration'
    ] = JSON.stringify(spec);
    if (reset && spec.kind === 'Deployment')
      Object.assign(spec, {
        spec: {
          template: {
            metadata: {
              annotations: {
                'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
              },
            },
          },
        },
      });
    try {
      // try to get the resource, if it does not exist an error will be thrown and we will end up in the catch
      // block.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(extend || reset)) await client.read(spec as any);
      // we got the resource, so it exists therefore patch
      const response = await client.patch(
        spec,
        'false',
        undefined,
        fieldManager,
        true,
        {
          headers: {
            'content-type': PatchUtils.PATCH_FORMAT_APPLY_YAML,
          },
        }
      );
      created.push(response.body);
    } catch (e) {
      // we did not get the resource, so it does not exist, so create it
      const response = await client.create(spec);
      created.push(response.body);
    }
  }
  return created;
}

export async function destroy(
  spec: string,
  client: KubernetesObjectApi
): Promise<KubernetesObject[]> {
  const specs: KubernetesObject[] = yaml.loadAll(spec) as KubernetesObject[];
  const validSpecs = specs.filter(s => s && s.kind && s.metadata);
  const destroyed: KubernetesObject[] = [];
  for (const spec of validSpecs) {
    // this is to convince the old version of TypeScript that metadata exists even though we already filtered specs
    // without metadata out
    spec.metadata = spec.metadata || {};
    spec.metadata.annotations = spec.metadata.annotations || {};
    try {
      // try to delete resource
      const response = await client.delete(spec);
      destroyed.push(response.body);
    } catch (e) {
      // we did not get the resource, therefore it may not exist
      console.warn(
        `${spec.kind} ${spec.metadata.name} failed to delete (it may not exist)`,
        e
      );
    }
  }
  return destroyed;
}
