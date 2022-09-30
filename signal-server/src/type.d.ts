interface sslOption {
  key: string;
  cert: string;
}

interface HttpsServerOptions {
  ip: string;
  ssl: sslOption;
  port: number;
  cryptoKey: string;
}

interface RedisClientOptions {
  redisHost: string;
}

interface EngineOptions {
  httpsServerOption: HttpsServerOptions;
  redisClientOption: RedisClientOptions;
}

export { sslOption, EngineOptions, HttpsServerOptions, RedisClientOptions };
