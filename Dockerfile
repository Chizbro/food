FROM node:22-alpine

WORKDIR /app
COPY server.mjs /app/server.mjs
COPY index.html app.js data.json manifest.webmanifest sw.js /app/public/
COPY icons /app/public/icons/

ENV DATA_DIR=/data \
    STATIC_DIR=/app/public \
    PORT=8080 \
    GH_REPO=Chizbro/food \
    GH_BRANCH=main

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
