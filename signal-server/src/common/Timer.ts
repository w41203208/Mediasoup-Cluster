export class Timer {
 private timeout: number;
 private timeoutObj: any;
 private serverTimeoutObj: any;
 public reset: Function;
 public start: Function;

 constructor(timeout: number) {
  this.timeout = timeout;
  this.timeoutObj = null;
  this.serverTimeoutObj = null;
  this.reset = () => {
   if (this.timeoutObj) clearTimeout(this.timeoutObj);
   if (this.serverTimeoutObj) clearTimeout(this.serverTimeoutObj);
   return this;
  }
  this.start = (timeStart: Function, timeout: Function) => {
   this.timeoutObj = setTimeout(() => {
    timeStart()
    this.serverTimeoutObj = setTimeout(() => {
     timeout();
    }, this.timeout);
   }, this.timeout);
  }
 }
}

