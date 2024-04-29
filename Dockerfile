FROM node:20-slim

RUN apt-get update && apt-get install -y ssh

COPY package*.json /tmp/
RUN cd /tmp && npm install
RUN mkdir -p /opt/app && cp -a /tmp/node_modules /opt/app/

WORKDIR /opt/app
COPY . /opt/app

RUN mkdir -p /root/.ssh/
RUN ssh-keygen -t ed25519 -b 4096 -C "ssh@localhost" -N "" -f /root/.ssh/id_ed25519

CMD ["npm", "run", "bot"]
