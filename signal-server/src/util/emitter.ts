import { Callback } from './type';

export class EventEmitter {
  _listeners: Record<string, Callback[]> = {};
  on(event: string, listener: Callback): void {
    if (this._listeners === undefined) this._listeners = {};
    const handler = this._listeners[event] || [];
    if (handler.indexOf(listener) === -1) {
      handler.push(listener);
    }
    this._listeners[event] = handler;
  }
  remove(event: string, listener: Callback) {
    if (this._listeners === undefined) return;
    const listeners = this._listeners;

    if (listeners[event] !== undefined) {
      const handler = listeners[event].filter((l) => {
        const lStr = l.toString().replace(/\s*/g, "");
        const listenerStr = listener.toString().replace(/\s*/g, "");
        return lStr !== listenerStr;
      });
      listeners[event] = handler;
      this._listeners[event] = [...listeners[event]];
    }
  }
  emit(event: string, ...args: any) {
    if (this._listeners === undefined) return;
    const handlers = this._listeners[event];
    if (handlers && handlers.length !== 0) {
      for (var i = 0; i < handlers.length; i++) {
        handlers[i].call(this, ...args);
      }
    }
  }
}
