import { Callback } from './type';

export class EventEmitter {
	_events: Record<string, Callback[]> = {};
	_eventsCount = 0;
	constructor() {}
	on(type: string, listener: Callback): void {
		let existingEvent;

		if (this._events === undefined) {
			this._events = {};
			this._eventsCount = 0;
		} else {
			existingEvent = this._events[type];
		}

		if (existingEvent === undefined) {
			existingEvent = [listener];
			++this._eventsCount;
		} else {
			existingEvent.push(listener);
		}

		this._events[type] = existingEvent;
	}
	remove(type: string, listener: Callback) {
		if (this._events === undefined) return;
		const listeners = this._events;

		if (listeners[type] !== undefined) {
			const handler = listeners[type].filter((l) => {
				const lStr = l.toString().replace(/\s*/g, '');
				const listenerStr = listener.toString().replace(/\s*/g, '');
				return lStr !== listenerStr;
			});
			listeners[type] = handler;
			this._events[type] = [...listeners[type]];
		}
	}
	emit(type: string, ...args: any) {
		if (this._events === undefined) return;
		const handlers = this._events[type];
		if (handlers && handlers.length !== 0) {
			for (var i = 0; i < handlers.length; i++) {
				handlers[i].call(this, ...args);
			}
		}
	}
}
