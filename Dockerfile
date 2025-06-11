FROM node:20-alpine AS circles
WORKDIR /app
COPY . .
EXPOSE 4000
CMD ["node", "dist/src/index.js"]

