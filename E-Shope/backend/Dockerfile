FROM node:20-alpine

WORKDIR /app

# Sharp (image resize) needs build tools on Alpine
RUN apk add --no-cache python3 make g++ vips-dev

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/uploads

EXPOSE 5000

CMD ["node", "index.js"]
