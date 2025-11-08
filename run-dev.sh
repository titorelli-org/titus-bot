#!/usr/bin/env sh

cd dist

node -r dotenv/config index.js | pino-pretty
