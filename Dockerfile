FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
ENV PORT=8787
EXPOSE 8787
CMD ["node", "dist/server.js"]
