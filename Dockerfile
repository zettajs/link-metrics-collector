FROM  node:0.12-slim
MAINTAINER Adam Magaluk

ADD     . /
WORKDIR /
RUN     npm install

CMD        ["collector"]
ENTRYPOINT ["node"]
