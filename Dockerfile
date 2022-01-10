<<<<<<< HEAD
FROM node:16.13.1-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
=======
FROM node:alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

>>>>>>> 095ef83... Implement gitlab ci/cd
CMD ["npm", "run", "dev"]