FROM node:22-bookworm-slim

WORKDIR /app

# Install Xray-core (this runs at Railway *build* time, which has internet
# access, unlike the container at runtime which may be network-restricted).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl unzip ca-certificates \
    && curl -fsSL -o /tmp/xray.zip "https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip" \
    && unzip -o /tmp/xray.zip -d /tmp/xray-extracted \
    && mv /tmp/xray-extracted/xray /usr/local/bin/xray \
    && chmod +x /usr/local/bin/xray \
    && rm -rf /tmp/xray.zip /tmp/xray-extracted \
    && apt-get purge -y curl unzip \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "--experimental-sqlite", "server.js"]
