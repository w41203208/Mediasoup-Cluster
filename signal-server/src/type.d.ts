interface sslOption {
  key: string;
  cert: string;
}

interface HttpsServerOptions {
  ip: string;
  ssl: sslOption;
  port: number;
}

interface EngineOptions {
  httpsServerOption: HttpsServerOptions;
}

export { sslOption, EngineOptions, HttpsServerOptions };
