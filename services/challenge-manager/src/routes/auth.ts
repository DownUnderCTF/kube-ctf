import { FastifyInstance } from "fastify";
import * as strings from "../strings";

export default async function register(fastify: FastifyInstance) {
  const { oidcStore } = fastify.container.cradle;

  fastify.get("/", (_request, reply) => {
    const config = oidcStore.getRemoteConfig();
    const clientId = oidcStore.getClientID();
    if (!config) {
      return reply.code(502).send({
        error: strings.ERROR_UNAVAILABLE,
      });
    }
    return {
      client_id: clientId,
      authorization_endpoint: config.authorization_endpoint,
    };
  });
}
