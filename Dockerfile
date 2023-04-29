FROM node:18-slim

RUN apt-get update -y && apt-get install python3 python3-pip coreutils procps -y

RUN python3 -m pip install twnet_parser

WORKDIR /app

COPY package*.json ./

RUN npm i

COPY . .

CMD ["node", "index.js"]

