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

interface HeartBeat {
  timeout: number;
  timeoutObj: any;
  serverTimeoutObj: any;
  reset: Function;
  start: Function;
}

export { sslOption, EngineOptions, HttpsServerOptions, HeartBeat };
