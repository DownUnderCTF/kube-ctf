#!/bin/bash

deployment="$1"
deployment_path=`realpath "deployments/$deployment"`

if [ -z "$deployment" ] || [ -z $2 ]; then
    echo "usage: $0 <deployment> [action...]" >&2
    exit 1
fi
if [ ! -d "$deployment_path" ]; then
    echo "deployment $deployment does not exist" >&2
    exit 1
fi

args=(-var-file="$deployment_path/vars.tfvars")
shift 1
if [ "$1" == "init" ]; then
    args+=(-backend-config="$deployment_path/backend.tfvars")
fi
TF_DATA_DIR="$deployment_path/.terraform" terraform -chdir=definition $@ "${args[@]}"
    