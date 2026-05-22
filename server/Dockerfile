FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS dev
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 3270
CMD ["npm", "run", "start:dev"]

FROM deps AS build
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
COPY uploads ./uploads
COPY storage ./storage
EXPOSE 3270
CMD ["npm", "run", "start:prod"]
