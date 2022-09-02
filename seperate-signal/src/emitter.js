class EventEmitter {
  _listeners = {};
  on(event, listener) {
    if (this._listeners === undefined) this._listeners = {};
    const handler = this._listeners[event] || [];
    if (handler.indexOf(listener) === -1) {
      handler.push(listener);
    }
    this._listeners[event] = handler;
  }
  remove(event, listener) {
    if (this._listeners === undefined) return;
    const listeners = this._listeners;
    if (listeners[event] !== undefined) {
      const handler = listeners[event].filter((l) => {
        return l.toString() !== listener.toString();
      });
      listeners[event] = handler;
    }
  }
  emit(event, data = null) {
    if (this._listeners === undefined) return;
    const handlers = this._listeners[event];
    if (handlers && handlers.length !== 0) {
      for (var i = 0; i < handlers.length; i++) {
        handlers[i].call(this, data);
      }
    }
  }
}

module.exports = {
  EventEmitter: EventEmitter,
};
