import { ServerEngine } from './src/engine';

const config = require('./config');
const fs = require('fs');
const path = require('path');

// ssl option
const sslOption = {
  key: fs.readFileSync(path.join(__dirname, config.ServerSetting.sslKey), 'utf-8'),
  cert: fs.readFileSync(path.join(__dirname, config.ServerSetting.sslCert), 'utf-8'),
};

const engineOptions = {
  serverOption: {
    ip: config.ServerSetting.listenIp,
    port: config.ServerSetting.listenPort,
    ssl: sslOption,
  },
  redisClientOption: {
    redisHost: config.ServerSetting.redisHost,
  },
  mediasoupOption: {
    numWorkers: config.MediasoupSetting.numWorkers,
    workerSettings: config.MediasoupSetting.worker,
    webRtcTransportSettings: config.MediasoupSetting.webRtcTransport,
    pipeTransportSettings: config.MediasoupSetting.pipeTransport,
  },
};
const engine = new ServerEngine(engineOptions);
engine.run();
