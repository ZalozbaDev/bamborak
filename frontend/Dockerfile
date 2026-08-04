########### build container
FROM node:24 AS frontendbuild
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY vite.config.js index.html .
ADD src/ src/
RUN npm run build

########### deployment container
FROM node:24
WORKDIR /app

# Nur die produktionsrelevanten Abhängigkeiten installieren
COPY package*.json ./
RUN npm ci --only=production

# Kopiere das gebaute Frontend UND den Backend-Code aus Stage 1
COPY --from=frontendbuild /app/dist ./dist

# Umgebungsvariable für den Produktionsmodus
ENV NODE_ENV=production
EXPOSE 3000

# Startet Ihre JavaScript-App direkt
CMD ["node", "dist/index.js"]
