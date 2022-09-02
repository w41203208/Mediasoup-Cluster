export class EventQueue {
  private queueRequests: Array<Function>;
  constructor() {
    this.queueRequests = [];
  }
  enqueueRequests() {}
}
