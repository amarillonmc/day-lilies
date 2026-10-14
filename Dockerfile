FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run assets:sync && npm run build && mkdir -p /app/.data && chown -R node:node /app/.data
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
ENV PUBLIC_ORIGIN=http://localhost:3001
USER node
EXPOSE 3001
VOLUME ["/app/.data"]
CMD ["npm", "start"]
