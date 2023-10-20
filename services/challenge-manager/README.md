Challenge Manager
=================

Challenge manager is used to spin up containers for isolated challenges, giving every team
a unique instance of a challenge.

## How it works
1. A request is made by the CTFd scoreboard (in reality it can be whatever system you choose).
2. The team id or user id is hashed with the challenge name and a secret in order to produce a container ID
This ensures that each user has a unique hostname and that if the challenge is relaunched, the user
will still have the same hostname.
3. The template is fetched from the kubernetes control plane. We then check if the current template
can be executed at the current time.
4. The container ID, owner ID, and expiry date is inejected into the template.
5. This template is then applied using the Kubernetes API.
6. If the player wants to extend the challenge expiry, they may do so by clicking the extend button.
This will restore the original expiry time on the challenge.

## Configuration
In hindsight, we could have used kubernetes secrets for some of the config values which we will probably do,
but this is quick and dirty.

```sh
# Environment variables

KUBECTF_NAMESPACE="default" # namespace to run the isolated challenges in
KUBECTF_BASE_DOMAIN="example.com" # base domain of the isolated challenges
KUBECTF_API_DOMAIN="challenge-manager.${BASE_DOMAIN}" # api domain of the isolated challenges
KUBECTF_MAX_OWNER_DEPLOYMENTS="0" # Maximum amunt of deployments per team. 0 is unlimited
KUBECTF_AUTH_SECRET="keyboard-cat" # secret to sign the JWT for CTFd
KUBECTF_CONTAINER_SECRET="keyboard-cat" # secret to generate the container IDs
KUBECTF_REGISTRY_PREFIX="gcr.io/downunderctf" # container registry prefix exposed through the handlebars variable registry_prefix
```

## Cleanup
The cleaning up of containers is done using [kube-janitor](https://codeberg.org/hjacobs/kube-janitor).
This is a job that runs periodically and removes resources that are past a certain expiry date, as we
can't rely on players to remember to shut down their resources.

## Authoring
An example template has been provided in the root of this repository at `templates/whoami/kube-isolated.yaml`.
Currently the system expects that at least the values below are defined for every resource. Challenge manager
currently does not validate that any of these exist at runtime (something we're looking at fixing), but
will fail to renew/remove the resource later on.

```
labels:
  kube-ctf.downunderctf.com/type: misc
  kube-ctf.downunderctf.com/name: challenge
  isolated-challenge.kube-ctf.downunderctf.com/deployment: "{{ deployment_id }}"
  isolated-challenge.kube-ctf.downunderctf.com/owner: "{{ owner_id }}"
annotations:
  janitor/expires: "{{ expires }}"
```


## Caveats
It may be resource heavy to spin up separate databases for each team, especially in larger CTFs. This
system has worked well for hosting DUCTF and we have load tested it up to 1000 concurrent containers
on Google Kubernetes Engine. It can probably support more, and should only be limited by the how fast
the control plane can handle requests.
