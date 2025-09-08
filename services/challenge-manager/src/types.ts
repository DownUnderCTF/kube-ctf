import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      owner: string;
      admin: boolean;
    };
  }
}
