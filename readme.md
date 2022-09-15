# DEMO

## Deploy

每個都是分開執行。

### Redis (不需要就不用執行)

- docker-composeup -d

### SFU Server

> #### Docker

- docker build -t sfuserver .
- docker-compose up -d

> #### ENV

- 修改 ANNOUNCED_IP 為 Instance Ip 就可以了。

### Signal Server

1. 待處理

### Frontend

> #### Docker

- docker build -t sfufrontend .
- docker-compose up -d

> #### ENV

-
