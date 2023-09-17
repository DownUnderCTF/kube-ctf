kube-ctf
========

Pre-configured kubernetes infrastructure with load balancing and some network hardening enabled. Also contains
per-team challenge assignment for web challenges. Inspired by [kCTF](https://github.com/google/kctf).

## How to Setup
1. Create the cluster
```sh
./scripts/cluster-deploy
```

2. Configure the cluster and IAM resources.
```sh
./scripts/cluster-configure
```

3. Install the cluster resources.
```sh
./scripts/cluster-install
```

4. Create config/values.yaml and populate it with values.
```yaml
domain:
  challenges: <root domain where challenges are hosted> # challenges will be a subdomain of this

replicas:
  challenge-manager: 2

cert:
  email: <contact email> # required for letsencrypt
  cfDNSToken: <cloudflare dns token> # used to configure dns-01 certificate validation


googleProject: <project ID of the Google Project>
```

4. Deploy the helm stack.
```sh
helm install kubectf -f config/values.yaml chart/
```

5. Upload the sample whoami challenge for testing.
```sh
kubectl apply -f templates/whoami/kube-isolated.yaml
```

## How to Deploy Isolated Challenges
See the README at [services/challenge-manager](services/challenge-manager)

## Authors
- [BlueAlder](https://github.com/BlueAlder)
- [jordanbertasso](https://github.com/jordanbertasso)
- [lecafard](https://github.com/lecafard)