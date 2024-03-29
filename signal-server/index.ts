import { config } from './config';
const fs = require('fs');
const path = require('path');

import { Log } from './src/util/Log';
import { ServerEngine } from './src/engine';

// // 要讓 Node 環境允許未授權的憑證，不然就是要使用以下方法，讓 Node 不會拒絕未授權憑證。
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config();

// ssl option
const sslOption = {
  key: fs.readFileSync(path.join(__dirname, config.ServerSetting.sslKey), 'utf-8'),
  cert: fs.readFileSync(path.join(__dirname, config.ServerSetting.sslCert), 'utf-8'),
};

const engineOptions = {
  httpsServerOption: {
    ssl: sslOption,
    ip: config.ServerSetting.listenIp,
    port: config.ServerSetting.listenPort,
    cryptoKey: config.ServerSetting.cryptoKey,
  },
  redisClientOption: {
    redisHost: config.ServerSetting.redisHost,
  },
};

const log = Log.GetInstance();

log.info('Server IP： %s', engineOptions.httpsServerOption.ip);
log.info('Server Port： %s', engineOptions.httpsServerOption.port);
log.info('Redis Info： %s', engineOptions.redisClientOption.redisHost);
const engine = new ServerEngine(engineOptions);
engine.run();
