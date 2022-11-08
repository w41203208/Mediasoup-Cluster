import { MEvent } from './event';
import { ISubscriber } from './subscriber';

export class PeerRouter {
	private _topics: Map<string, MEvent<any>[]>;
	private _subscriberForTopic: Map<string, ISubscriber[]>;

	constructor() {
		this._topics = new Map();
		this._subscriberForTopic = new Map();
	}

	addTopic(tName: string) {
		if (!this._topics.has(tName)) {
			this._topics.set(tName, []);
		}
	}

	subscribe(tName: string, subscriber: ISubscriber) {
		if (!this._subscriberForTopic.has(tName)) {
			this._subscriberForTopic.set(tName, []);
		}
		const subscribers = this._subscriberForTopic.get(tName);
		subscribers?.push(subscriber);
	}

	publish(event: MEvent<any>) {
		const topic = event.topic;
		if (!this._topics.get(topic)) {
			new Error('not this topic');
		}
		const subscribers = this._subscriberForTopic.get(topic);
		subscribers?.forEach((v: ISubscriber) => {
			v.update(event.payload);
		});
	}
}
