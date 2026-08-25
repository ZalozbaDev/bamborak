########### build container
FROM node:24 AS frontendbuild
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY vite.config.js index.html .
ADD src/ src/
ADD public/ public/
RUN npm run build
RUN mkdir -p dist/config/ && touch dist/config/runtime-config.js

########### deployment container
# FROM nginx:stable-alpine
FROM nginxinc/nginx-unprivileged:stable-alpine

# make sure the router works (pages fall back to the index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --chown=nginx:nginx --from=frontendbuild /app/dist /usr/share/nginx/html

COPY --chown=nginx:nginx docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

# EXPOSE 80
EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
