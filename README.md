kube-ctf
========

Pre-configured kubernetes infrastructure with load balancing and some network hardening enabled. Also contains
per-team challenge assignment for web challenges. Inspired by [kCTF](https://github.com/google/kctf).

## How to Setup
1. Create the cluster
```sh
./scripts/cluster-deploy
```

2. Configure the cluster and IAM resources, and build the challenge-manager container.
```sh
./scripts/cluster-configure
```

3. Upload the sample whoami challenge
```sh
GOOGLE_APPLICATION_CREDENTIALS=<sevice account json> ./scripts/process-isolated-challenges
```

## How to Write Isolated Challenges
TODO

## TODO
- `./scripts/process-isolated-challenges` already exists to process the challenge templates and upload them
to Google Cloud Datastore. We should integrate this with GitHub actions in order to do automatic deployments
on push.
- Interface this with CTFd
- TLS termination for challenges, which can be done by adding cert-manager.

## Authors
- [BlueAlder](https://github.com/BlueAlder)
- [jordanbertasso](https://github.com/jordanbertasso)
- [lecafard](https://github.com/lecafard)