FROM node:20.11.1-bookworm
MAINTAINER Daniel Sobe <daniel.sobe@sorben.com>

# docker build --progress=plain -t bamborak_frontend .
# docker build --progress=plain -t bamborak_frontend . --no-cache

RUN mkdir -p /application/src

COPY src    /application/src
COPY package.json package-lock.json vite.config.js index.html /application

RUN cd application && npm install

COPY startme.sh /

CMD ["/bin/bash", "-c", "/startme.sh"] 
