########### build container
FROM node:24 AS frontendbuild
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY vite.config.js index.html .
ADD src/ src/
RUN npm run build

########### deployment container
FROM nginx:stable-alpine

# make sure the router works (pages fall back to the index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=frontendbuild /app/dist /usr/share/nginx/html

# internal port is 80
CMD ["nginx", "-g", "daemon off;"]
