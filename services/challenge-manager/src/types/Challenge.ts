export type Challenge = {
  name: string;
  expires: number;
  available_at: number;
  updated_at: number;
  type: string;
  template: string;
};

export type KubeIsolatedChallenge = {
  metadata: {
    name: string;
  };
  spec: {
    expires: number;
    available_at: number;
    type: string;
    template: string;
  };
};
