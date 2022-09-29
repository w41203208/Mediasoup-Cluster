# DEMO

## Deploy

每個都是分開執行。

### Redis (不需要就不用執行)

- docker-composeup -d

### SFU Server

> #### Docker

- docker build -t sfuserver .
- DEV：docker-compose -f docker-compose.dev.yml --env-file ./dev.env up -d
- PRO：docker-compose -f docker-compose.yml --env-file ./.env up -d

Dev：192.168.1.98:8585、192.168.1.98:7878

Release：192.168.1.98:30000、192.168.1.98:20000 -> 這裡要修改 Signal Server 的 SFU Connection ENV

> #### ENV

- 修改 ANNOUNCED_IP 為 Instance Ip 就可以了。

### Signal Server

- docker build -t sfusignal .
- docker-compose up -d

### Frontend

> #### Docker

- docker build -t sfufrontend .
- docker-compose up -d

> #### ENV

-
