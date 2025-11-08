# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=22.19.0

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV=production

WORKDIR /usr/run/titus-bot

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

USER nextjs

COPY --chown=nextjs:nodejs . .

RUN npm install --include dev

# Run the application.
CMD [ "npm", "start" ]
