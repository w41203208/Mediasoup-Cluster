import { clearTimeout } from 'timers';

export class TimeBomb {
  private _time: number;
  private _bombFunction: Function;
  private _timeOutFunction: any;

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
