FROM node:24.12-alpine AS base
WORKDIR /app

RUN apk update && apk upgrade --no-cache

RUN npm update glob

FROM base AS build
COPY . .
RUN npm ci
RUN npm run build

FROM base AS production

RUN npm r -g npm

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY .env.example ./.env

EXPOSE 3000
CMD ["node", "dist/index.js"]