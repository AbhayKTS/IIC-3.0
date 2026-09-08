#!/usr/bin/env bash
set -euo pipefail

export FIRESTORE_EMULATOR_HOST=${FIRESTORE_EMULATOR_HOST:-127.0.0.1:8080}
export FIREBASE_AUTH_EMULATOR_HOST=${FIREBASE_AUTH_EMULATOR_HOST:-127.0.0.1:9099}
export GCLOUD_PROJECT=${GCLOUD_PROJECT:-demo-test}
export FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID:-demo-test}

firebase emulators:start --only firestore,auth
