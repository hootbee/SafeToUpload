FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY server/package*.json ./
RUN npm ci

FROM deps AS dev
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/. .
COPY shared /shared
EXPOSE 3270
CMD ["npm", "run", "start:dev"]

FROM deps AS build
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/. .
COPY shared /shared
RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
COPY server/uploads ./uploads
COPY server/storage ./storage
EXPOSE 3270
CMD ["npm", "run", "start:prod"]
