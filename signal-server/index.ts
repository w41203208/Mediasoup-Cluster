const config = require('./config');
const fs = require('fs');
const path = require('path');

import { ServerEngine } from './src/engine';

require('dotenv').config();

// ssl option
const sslOption = {
  key: fs.readFileSync(path.join(__dirname, config.ServerSetting.sslKey), 'utf-8'),
  cert: fs.readFileSync(path.join(__dirname, config.ServerSetting.sslCert), 'utf-8'),
};

const engineOptions = {
  httpsServerOption: {
    ip: config.ServerSetting.listenIp,
    port: config.ServerSetting.listenPort,
    ssl: sslOption,
  },
};

const engine = new ServerEngine(engineOptions);
engine.run();
