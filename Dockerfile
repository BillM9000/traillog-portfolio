# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --production
COPY server/ ./server/
COPY --from=frontend /app/client/dist ./client/dist
COPY vote-page/ ./vote-page/

RUN addgroup -g 1001 appuser && adduser -D -u 1001 -G appuser appuser
RUN mkdir -p /app/data && chown -R appuser:appuser /app
USER appuser

ENV PORT=3614
ENV DATA_DIR=/app/data
EXPOSE 3614

CMD ["node", "server/index.js"]
