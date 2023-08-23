FROM node:18-slim

RUN apt-get update -y && apt-get install python3 python3-pip coreutils procps build-essential curl -y

RUN curl https://sh.rustup.rs -sSf | bash -s -- -y
RUN echo 'source $HOME/.cargo/env' >> $HOME/.bashrc
ENV PATH="/root/.cargo/bin:${PATH}"

RUN python3 -m pip install twnet_parser dpkt libtw2-huffman --break-system-packages

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

