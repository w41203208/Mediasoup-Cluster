const APP_NAME = 'MediaSoup-Demo-Server';

enum logger {
  debug = 'DEBUG',
  info = 'LOG',
  warn = 'WARN',
  error = 'ERROR',
}

type LogFunc = (t: string) => void;

export class Logger {
  _debug: LogFunc;
  _warn: LogFunc;
  _info: LogFunc;
  _error: LogFunc;
  constructor() {
    this._debug = function (t: string = '') {
      console.log(`[${logger.debug}][${APP_NAME}]===================[${t}]`);
    };
    this._warn = function (t: string = '') {
      console.log(`[${logger.warn}][${APP_NAME}]===================[${t}]`);
    };
    this._info = function (t: string = '') {
      console.log(`[${logger.info}][${APP_NAME}]===================[${t}]`);
    };
    this._error = function (t: string = '') {
      console.log(`[${logger.error}][${APP_NAME}]===================[${t}]`);
    };
  }

  debug(t: string) {
    this._debug(t);
  }
  info(t: string) {
    this._info(t);
  }
  warn(t: string) {
    this._warn(t);
  }
  error(t: string) {
    this._error(t);
  }
}
