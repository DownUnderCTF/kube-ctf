FROM node:16-alpine AS build
WORKDIR /build
COPY package.* yarn.lock /build/
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:16-alpine AS prod
WORKDIR /app
COPY package.* yarn.lock /app/
RUN yarn install --frozen-lockfile --production
COPY --from=build /build/dist /app/dist
CMD yarn prod