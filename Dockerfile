FROM node:18-slim

RUN apt-get update -y && apt-get install python3 python3-pip coreutils procps -y

RUN python3 -m pip install twnet_parser --break-system-packages

WORKDIR /home/pi

COPY package*.json ./

RUN npm i

COPY . .

RUN npm run build || true

RUN groupadd -g 1001 pi
RUN useradd -u 1001 -g pi -ms /bin/bash pi

RUN chown -R 1001:1001 /home/pi

USER 1001

CMD ["node", "dist/index.js"]

