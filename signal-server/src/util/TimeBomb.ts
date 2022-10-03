import { clearTimeout } from 'timers';

export class TimeBomb {
  // private timeout: number;
  // private timeoutObj: any;
  // private serverTimeoutObj: any;
  // public reset: Function;
  // public start: Function;
  private _time: number;
  private _bombFunction: Function;

  private _timeOutFunction: any;

  // constructor(timeout: number) {
  //   this.timeout = timeout;
  //   this.timeoutObj = null;
  //   this.serverTimeoutObj = null;
  //   this.reset = () => {
  //     if (this.timeoutObj) clearTimeout(this.timeoutObj);
  //     if (this.serverTimeoutObj) clearTimeout(this.serverTimeoutObj);
  //     return this;
  //   };
  //   this.start = (timeStart: Function, timeout: Function) => {
  //     this.timeoutObj = setTimeout(() => {
  //       timeStart();
  //       this.serverTimeoutObj = setTimeout(() => {
  //         timeout();
  //       }, this.timeout);
  //     }, this.timeout);
  //   };
  // }

  constructor(time: number, bombFunction: Function) {
    this._time = time;
    this._bombFunction = bombFunction;
  }

  countDownStart() {
    this._timeOutFunction = setTimeout(() => {
      this.bomb();
    }, this._time);
  }

  countDownReset() {
    if (this._timeOutFunction) clearTimeout(this._timeOutFunction);
  }

  bomb() {
    this._bombFunction();
  }
}
