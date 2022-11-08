# Signal Server

## Development

### Use prettier

```bash
npx prettier --write .
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