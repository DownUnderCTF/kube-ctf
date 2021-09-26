Challenge Manager
=================

Challenge manager is used to spin up containers for isolated challenges, giving every team
a unique instance of a challenge.

## How it works
1. A request is made by the CTFd scoreboard (in reality it can be whatever system you choose).
2. The team id or user id is hashed with the challenge name and a secret in order to produce a container ID.
3. The template is fetched from Cloud Datastore with the specified name and available date.
4. The container ID, owner ID, and expiry date is inejected into a template.
5. This template is then applied using the Kubernetes API.

## Configuration
In hindsight, we could have used kubernetes secrets for some of the config values which we will probably do, but
I am quite lazy.

```sh
# Environment variables

KUBECTF_NAMESPACE="default" # namespace to run the isolated challenges in
KUBECTF_BASE_DOMAIN="example.com" # base domain of the isolated challenges
KUBECTF_API_DOMAIN="challenge-manager.${BASE_DOMAIN}" # api domain of the isolated challenges
KUBECTF_MAX_OWNER_DEPLOYMENTS="0" # Maximum amunt of deployments per team. 0 is unlimited
KUBECTF_AUTH_SECRET="keyboard-cat" # secret to sign the JWT for CTFd
KUBECTF_CONTAINER_SECRET="keyboard-cat" # secret to generate the container IDs
```

## Cleanup
The cleaning up of containers is done through [kube-janitor](https://codeberg.org/hjacobs/kube-janitor).
This is a job that runs periodically and removes resources that are past a certain expiry date.

## Caveats
It may be resource heavy to spin up separate databases for each team, especially in larger CTFs.