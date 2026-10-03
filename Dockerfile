FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=8787 DATA_FILE=/data/db.json
EXPOSE 8787
CMD ["npm", "start"]
