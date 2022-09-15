interface sslOption {
  key: string;
  cert: string;
}

interface HttpsServerOptions {
  ip: string;
  ssl: sslOption;
  port: number;
}

export { sslOption, HttpsServerOptions };
