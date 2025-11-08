#!/usr/bin/env bash

cd dist

node -r dotenv/config index.js | pino-pretty
