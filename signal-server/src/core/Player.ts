export class Player {
	private _id: string;
	private _name: string;
	private _serverId: string;
	private _routerId: string;
	private _role: string;
	private _sendTransport?: any;
	private _recvTransport?: any;
	private _producers: Map<string, Record<string, any>>;
	private _consumers: Map<string, Record<string, any>>;
	private _rtpCapabilities?: any;

	private onClose: Function = () => {};
	private onPublishProduce: Function = () => {};

	constructor(pid: string, pn: string = '', sid: string, rid: string, pr: string) {
		/* base info */
		this._id = pid;
		this._name = pn;
		this._serverId = sid;
		this._routerId = rid;
		this._role = pr;

		/* mediasoup info */
		this._sendTransport = null;
		this._recvTransport = null;
		this._producers = new Map();
		this._consumers = new Map();
		this._rtpCapabilities = null;
	}

	OnClose(func: Function) {
		this.onClose = func;
	}

	OnPublishProduce(func: Function) {
		this.onPublishProduce = func;
	}

	get id() {
		return this._id;
	}

	set serverId(id) {
		this._serverId = id;
	}

	set routerId(id) {
		this._routerId = id;
	}

	set rtpCapabilities(cp) {
		this._rtpCapabilities = cp;
	}

	get serverId() {
		return this._serverId;
	}
	get routerId() {
		return this._routerId;
	}

	get role() {
		return this._role;
	}

	get sendTransport() {
		return this._sendTransport;
	}

	get recvTransport() {
		return this._recvTransport;
	}

	get producers() {
		return this._producers;
	}

	get consumers() {
		return this._consumers;
	}

	get rtpCapabilities() {
		return this._rtpCapabilities;
	}

	close() {
		this.onClose();
	}

	// getRouterRtpCapabilities() {
	//   this.onGetRouterRtpCapabilities();
	// }

	addTransport(id: string, transportType: string) {
		if (transportType === 'consuming') {
			this._recvTransport = {
				id: id,
			};
		} else {
			this._sendTransport = {
				id: id,
			};
		}
	}
	produce(id: string) {
		this.addProducer(id);
		this.onPublishProduce(id);
	}

	addProducer(id: string) {
		this._producers.set(id, {
			id: id,
		});
	}
	addConsumer(id: string) {
		this._consumers.set(id, {
			id: id,
		});
	}
}
