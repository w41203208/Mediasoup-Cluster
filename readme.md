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

- DEV：docker-compose -f docker-compose.dev.yml --env-file ./dev.env up -d

- PRO：docker-compose -f docker-compose.yml --env-file ./pro.env up -d

### Frontend

> #### Docker

- docker build -t sfufrontend .
- docker-compose up -d

> #### ENV

-

## Problem

- Memory leak

- peer is duplicate

- for 0~99 to excute join room, redis player count is weird

- 當一個 sfu server 滿了，房主也已經開視訊，新的人加入會沒有畫面（get producer）

## Web mediasoupclient

- rtpParameter - producer

- rtpCapability - consumer

- producer：根據使用者創建的 track ortc 解析，產生 rtpParameters。

- consumer：根據 rtpCapability 來創建

- dtlsRole：consumer and producer is all server
