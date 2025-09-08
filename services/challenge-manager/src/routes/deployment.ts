import { KubernetesObject, V1Deployment } from "@kubernetes/client-node";
import { FastifyInstance, FastifyRequest } from "fastify";
import {
  AUTH_SECRET,
  API_DOMAIN,
  BASE_DOMAIN,
  MAX_OWNER_DEPLOYMENTS,
  OIDC_OWNER_ID_FIELD,
  REDIS_URL,
} from "../config";
import * as strings from "../strings";
import { DeploymentParams, ModifyDeploymentRequest } from "../schema";
import { jwtVerify } from "jose";
import type { OIDCStore } from "../stores/OIDCStore";
import { NoTeamError } from "../error";
import RateLimit from "@fastify/rate-limit";
import Redis from "ioredis";

const mapDeploymentToResponse = ({ metadata }: V1Deployment) => ({
  name: metadata?.labels?.["kube-ctf.downunderctf.com/name"],
  host: `${
    metadata?.labels?.[`${strings.ISOLATED_CHALLENGE_QUALIFIER}/deployment`]
  }.${BASE_DOMAIN}`,
  expires: metadata?.annotations?.["janitor/expires"],
  owner: metadata?.labels?.[`${strings.ISOLATED_CHALLENGE_QUALIFIER}/owner`],
});

const validateLocalToken = async (
  token: string,
): Promise<FastifyRequest["user"]> => {
  const payload = (
    await jwtVerify(token, Buffer.from(AUTH_SECRET), {
      audience: API_DOMAIN,
      algorithms: ["HS256"],
    })
  ).payload as { owner_id: string; admin: boolean };
  const owner = payload.owner_id || "-1";
  if (!owner) throw new Error("user has no team");
  return {
    owner,
    admin: !!payload.admin,
  };
};

const validateRemoteToken = async (
  store: OIDCStore,
  token: string,
): Promise<FastifyRequest["user"]> => {
  const jwks = store.getJWKs();
  const config = store.getRemoteConfig();
  if (!config || !jwks) {
    throw new Error("Remote token config not ready");
  }
  const payload = (
    await jwtVerify(token, jwks, {
      issuer: config.issuer,
      audience: store.getClientID(),
      algorithms: config.id_token_signing_alg_values_supported,
    })
  ).payload;
  const owner = (payload[OIDC_OWNER_ID_FIELD] as string) || "-1";
  if (owner === "-1" || !owner) throw new NoTeamError();
  return {
    owner: owner,
    admin: (payload["roles"] as string[]).includes("admin"),
  };
};

export default async function register(fastify: FastifyInstance) {
  const { kubeClient, challengeConfigStore } = fastify.container.cradle;

  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.headers.authorization)
      return reply.code(401).send({
        error: strings.ERROR_UNAUTHORIZED,
      });

    // extract and verify token
    const token = request.headers.authorization.match(/^(Bearer|Remote) (.*)$/);
    if (!token)
      return reply.code(401).send({
        error: strings.ERROR_INVALID_CREDENTIALS,
      });

    try {
      if (token[1] === "Bearer") {
        request.user = await validateLocalToken(token[2]);
      } else if (token[1] === "Remote") {
        request.user = await validateRemoteToken(
          fastify.container.cradle.oidcStore,
          token[2],
        );
      } else {
        throw new Error("No tokens matched");
      }

      request.log.info(
        `auth_info: owner=${request.user?.owner}${
          request.user?.admin ? ", admin" : ""
        }`,
      );
    } catch (e) {
      request.log.debug(e, "auth error");
      if (e instanceof NoTeamError) {
        reply.code(401).send({
          error: strings.ERROR_NO_TEAM,
        });
      } else {
        reply.code(401).send({
          error: strings.ERROR_INVALID_CREDENTIALS,
        });
      }
    }
  });

  await fastify.register(RateLimit, {
    max: 30,
    hook: "preHandler",
    cache: 6000,
    keyGenerator: (r) => r.user?.owner || r.ip,
    timeWindow: "1 minute",
    redis: REDIS_URL ? new Redis(REDIS_URL) : undefined,
    // allowList: (r) => !!r.user?.admin
  });

  // List all deployments made by an owner
  fastify.route({
    method: "GET",
    url: "/",
    handler: async (request, reply) => {
      reply.send({
        deployments: (
          await kubeClient.getDeploymentsByOwner(request.user!.owner)
        ).map(mapDeploymentToResponse),
      });
    },
  });

  fastify.route<{ Params: { name: string } }>({
    method: "GET",
    url: "/:name",
    schema: {
      params: DeploymentParams,
    },
    handler: async (request, reply) => {
      const { owner } = request.user!;

      const name = request.params.name as string;

      const challenge =
        await fastify.container.cradle.challengeConfigStore.getChallenge(
          name,
          true,
        );
      if (!challenge) {
        return reply.code(404).send({
          error: strings.ERROR_DEPLOYMENT_NOT_FOUND,
        });
      }
      // Get the deployment
      const deployment = await kubeClient.getDeploymentByNameAndOwner(
        name,
        owner,
      );

      if (!deployment) {
        return reply.code(404).send({
          error: strings.ERROR_DEPLOYMENT_NOT_FOUND,
        });
      }

      return reply.send({
        deployment: mapDeploymentToResponse(deployment),
      });
    },
  });

  fastify.route<{
    Params: { name: string };
    Body: { reset: boolean; extend: boolean };
  }>({
    method: "POST",
    url: "/:name",
    schema: {
      body: ModifyDeploymentRequest,
      params: DeploymentParams,
    },
    config: {
      rateLimit: {
        max: 6,
        timeWindow: "1 minute",
      },
    },
    handler: async (request, reply) => {
      const { owner, admin } = request.user!;
      const spec = await challengeConfigStore.getChallenge(
        request.params.name,
        admin,
      );

      // Get all deployments (for rate limiting purposes)
      const deployments = await kubeClient.getDeploymentsByOwner(owner);
      // Check if challenge name exists in current deployments
      const deployment = deployments.find(
        ({ metadata }) =>
          metadata?.labels?.[`${strings.API_GROUP}/name`] ===
          request.params.name,
      );
      if (deployment && !(request.body.reset || request.body.extend)) {
        return reply.code(400).send({
          error: strings.ERROR_DEPLOYMENT_EXISTS,
        });
      }

      if (!spec)
        return reply.code(400).send({
          error: strings.ERROR_CHALLENGE_NOT_FOUND,
        });

      let res: KubernetesObject[];
      if (deployment && request.body.reset) {
        // reset
        request.log.info("deploy: type=reset");
        res = await kubeClient.reset(spec, owner);
      } else if (deployment && request.body.extend) {
        // extend
        request.log.info("deploy: type=extend");
        const expires = deployment.metadata?.annotations?.["janitor/expires"];
        if (
          expires &&
          Math.floor((new Date(expires).getTime() - Date.now()) / 1000) >
            Math.floor(spec.expires / 2)
        ) {
          return reply.code(429).send({
            error: strings.ERROR_RENEW_TOO_SOON,
          });
        }
        res = await kubeClient.extend(spec, owner);
      } else {
        // check container limit
        if (
          !admin &&
          MAX_OWNER_DEPLOYMENTS !== 0 &&
          deployments.length >= MAX_OWNER_DEPLOYMENTS
        ) {
          request.log.info("deploy: error=deployment_limit");
          return reply.code(403).send({
            error: strings.ERROR_DEPLOYMENT_LIMIT,
          });
        }

        request.log.info("deploy: type=new");
        res = await kubeClient.deploy(spec, owner);
      }

      // find the deployment object
      const newDeployment = res.find(({ kind }) => kind === "Deployment");

      if (!newDeployment)
        return reply.code(500).send({
          error: "Deployment failed.",
        });

      reply.send({
        deployment: mapDeploymentToResponse(newDeployment),
      });
    },
  });

  fastify.route<{ Params: { name: string } }>({
    method: "DELETE",
    url: "/:name",
    schema: {
      params: DeploymentParams,
    },
    config: {
      rateLimit: {
        max: 6,
        timeWindow: "1 minute",
      },
    },
    handler: async (request, reply) => {
      const { owner } = request.user!;
      const spec = await challengeConfigStore.getChallenge(
        request.params.name,
        true,
      );

      // Get all deployments (for rate limiting purposes)
      const deployment = await kubeClient.getDeploymentByNameAndOwner(
        request.params.name,
        owner,
      );

      if (!deployment)
        return reply.code(404).send({
          error: strings.ERROR_DEPLOYMENT_NOT_FOUND,
        });

      if (!spec)
        return reply.code(404).send({
          error: strings.ERROR_CHALLENGE_NOT_FOUND,
        });

      await kubeClient.destroy(spec, owner);
      return reply.send({});
    },
  });
}
