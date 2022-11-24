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

## Test

測試分為兩邊

- 房間管理的測試 **branch：jay_dev**

1. 先在 signal server 使用 genCrypto.ts 這個檔案 產生 name.txt
2. 將剛剛產生的檔案丟給 webrtc-sfu-demo
3. 在 test.vue 的頁面，input name.txt file
4. Range 就是要取 name.txt 中的範圍 Max 會是輸入的-1，假如你要 0~50，要輸入 Min：0、Max：51
5. Role 是用來表示這個 Range 裡面的第一個是否要有 Producer 基本上，我是第一個網頁的分頁兩個都打勾，第二或後面的只勾 Consumer。
6. File 就是第 3 點的
7. Test 就是開始測試

- rtp peerconnection 測試 **branch：dev_test**

備註：在測試 rtp peerconnection 的測試，因為會遇到有關 docker 的問題，所以需要使用 windows 來在本地跑程式碼。

基本上就是照著官方的方式，然後在 npm install 之前執行 **call "D:\Visual Studio\VC\Auxiliary\Build\vcvars64.bat"**

## Problem

## Web mediasoupclient

- rtpParameter - producer

- rtpCapability - consumer

- producer：根據使用者創建的 track ortc 解析，產生 rtpParameters。

- consumer：根據 rtpCapability 來創建

- dtlsRole：consumer and producer is all server
