FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY patches ./patches
RUN npm ci
COPY . .
ARG VITE_JELLYFIN_URL
ARG VITE_BRAND_MARK
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/seerr-proxy.sh /docker-entrypoint.d/40-seerr-proxy.sh
COPY --from=build /app/dist /usr/share/nginx/html
