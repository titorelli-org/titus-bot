# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=22.19.0

FROM node:${NODE_VERSION}-alpine AS packer

# Use production node environment by default.
ENV NODE_ENV=production

WORKDIR /usr/src/titus-bot

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage a bind mounts to package.json and package-lock.json to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm

# Copy the rest of the source files into the image.
COPY . .

RUN npm install --also dev

RUN npm run bundle

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Run the application as a non-root user.
USER nextjs

# DEBUG ONLY
WORKDIR /usr/run/titus-bot

# RUN npm install pino

# COPY --from=packer /usr/src/titus-bot/node_modules node_modules
COPY --from=packer --chown=nextjs:nodejs /usr/src/titus-bot/dist/index.js .

# Run the application.
CMD [ "node", "index.js" ]
