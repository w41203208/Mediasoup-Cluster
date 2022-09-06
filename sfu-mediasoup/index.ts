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
    port: config.ServerSetting.listenPort,
    ssl: sslOption,
  },
  mediasoupOption: {
    numWorkers: config.MediasoupSetting.numWorkers,
    workerSettings: config.MediasoupSetting.worker,
    webRtcTransportSettings: config.MediasoupSetting.webRtcTransport,
  },
};

const engine = new ServerEngine(engineOptions);
engine.run();
