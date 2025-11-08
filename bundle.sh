#!/usr/bin/env sh

npx ncc build src/index.ts -C -t -o dist

mkdir dist/templates
mkdir dist/static

cp .env dist/.env
cp -r src/lib/messages/templates/ dist/templates
cp -r src/static dist
