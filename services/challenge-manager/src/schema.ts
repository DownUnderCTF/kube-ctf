import { Static, Type } from "@sinclair/typebox";

export const DeploymentParams = Type.Object({
  name: Type.String({ pattern: "^[0-9a-z_-]+$" }),
});
export type DeploymentParams = Static<typeof DeploymentParams>;

export const ModifyDeploymentRequest = Type.Object({
  reset: Type.Optional(Type.Boolean()),
  extend: Type.Optional(Type.Boolean()),
});
export type ModifyDeploymentRequest = Static<typeof ModifyDeploymentRequest>;
