# Single-stage: use pre-built client dist from local build
FROM node:20-alpine
WORKDIR /app

# Server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Copy server, pre-built client, and vote page
COPY server/ ./server/
COPY client/dist ./client/dist
COPY vote-page/ ./vote-page/

RUN addgroup -g 1001 appuser && adduser -D -u 1001 -G appuser appuser
RUN mkdir -p /app/data/troop-logos /app/data/adventure-documents
RUN chown -R appuser:appuser /app
USER appuser

ENV PORT=3614
EXPOSE 3614

CMD ["node", "server/index.js"]
