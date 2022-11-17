# Signal Server

## Development

### Server

- **connect**：connect to client or sfu server
  - wstransport：server to client
  - wsserver：websocket server
  - httpsserver：rest api server
- **core**：manage room logical
  - client logic
    - peer：use wstransport to send websocket and control some peer code
  - room logic
    - player：
    - room：
  - roomcreator：create room info in redis
  - roommanager：manage room in local signal server
  - sfuallocator：allocate sfu ip_port for player to connect sfu server
  - sfuconnectionmanager：manage sfu connection
  - clientconnectionmanager：manage client/peer connection

- **redis**：request with redis
- **router**：pubsub between peer and roomManager
- **service**：design connection how to handle request and send request to sfu
- **util**：some tool
- **engine**：server engine




### Format

Use prettier to format code

```bash
npx prettier --write .
```

VScode settings.json to auto format code, can add this row in settings.json and save the file.

```bash
"editor.formatOnSave": true,
```


## Deploy

### DEV

```bash
docker-compose -f docker-compose.dev.yml --env-file ./dev.env up -d
```

### PROD
```bash
PRO：docker-compose -f docker-compose.prod.yml --env-file ./pro.env up -d
```