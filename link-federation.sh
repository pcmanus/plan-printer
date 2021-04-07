#!/usr/bin/env bash

if [ -z $1 ];
then
  echo "Please pass the path to the local directory where federation is cloned."
  exit 1
fi
FEDERATION_DIR=$1

# Linking locally
npm link "$FEDERATION_DIR/federation-js" --save
npm link "$FEDERATION_DIR/query-planner-js" --save

echo "Linked to federation at: $FEDERATION_DIR"

