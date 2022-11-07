# DEMO

## Deploy

每個都是分開執行。

### Redis (不需要就不用執行)

- docker-composeup -d

### SFU Server

#### Linux

> #### Docker
>
> - docker build -t sfuserver .
> - DEV：docker-compose -f docker-compose.dev.yml --env-file ./dev.env up -d
> - PRO：docker-compose -f docker-compose.yml --env-file ./.env up -d
>
> Dev：192.168.1.98:8585、192.168.1.98:7878
>
> Release：192.168.1.98:30000、192.168.1.98:20000 -> 這裡要修改 Signal Server 的 SFU Connection ENV

> #### ENV
>
> - 修改 ANNOUNCED_IP 為 Instance Ip 就可以了。

#### Windows

> 小心 MinGw 使用 chocolatey 安裝的話，要把 chocolatey 的環境變數放到 VC or MinGW 後面，因為它裡面也有 make.exe，build medisaoup 的時候會找不到

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

- for 0~99 to excute join room, redis player count is weird

## Web mediasoupclient

- rtpParameter - producer

- rtpCapability - consumer

- producer：根據使用者創建的 track ortc 解析，產生 rtpParameters。

- consumer：根據 rtpCapability 來創建

- dtlsRole：consumer and producer is all server
