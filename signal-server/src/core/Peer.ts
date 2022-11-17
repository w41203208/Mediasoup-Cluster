import { EventEmitter } from '../util/emitter';
import { WSTransport } from '../connect/WSTransport';
import { TimeBomb } from '../util/TimeBomb';
import { PeerRouter } from '../router/peerRouter';
import { MEvent } from '../router/event';

interface PeerMessage {
	identity: string;
	message: any;
}

export class Peer extends EventEmitter {
	private _id: string;
	private _roomId: string;
	private _ws: WSTransport | null;

	// private _roomService: RoomService;
	private _bomb?: TimeBomb | null;
	private _timeoutFunction: any;

	constructor(pkey: any, websocket: WSTransport /* roomService: RoomService*/) {
		super();

		this._id = pkey.peerId;
		this._roomId = pkey.roomId;

		/* websocket */
		this._ws = websocket;
	}

	died() {
		if (this._timeoutFunction) clearTimeout(this._timeoutFunction);
		this._bomb?.countDownReset();
		this._bomb = null;
		this._ws?.close();
		this._ws = null;
	}

	createPeerMessage(message: any): PeerMessage {
		const peerMessage = {
			identity: this._id,
			roomId: this._roomId,
			message: {
				id: message.id,
				data: message.data,
				type: message.type,
			},
		} as PeerMessage;
		return peerMessage;
	}

	handleTransportMessage(peerRouter: PeerRouter) {
		this._ws!.on('request', (message: any) => {
			const pm = this.createPeerMessage(message);
			const event = new MEvent(pm, 'rtc');
			peerRouter.publish(event);
		});
		this._ws!.on('notification', (message: { type: string; data: any }) => {
			const { type, data } = message;
			switch (type) {
				case 'heartbeatCheck':
					if (data.msg === 'pong') {
						this.resetPing();
					}
					break;

				// default:
				//   this.emit('handleOnRoomNotification', this, type, data);
				//   break;
			}
		});
	}

	get id() {
		return this._id;
	}

	get roomId() {
		return this._roomId;
	}

	setTimeBomb(bomb: TimeBomb) {
		this._bomb = bomb;

		this.startPing();
	}

	resetPing() {
		if (this._timeoutFunction) clearTimeout(this._timeoutFunction);
		this._bomb?.countDownReset();
		this.startPing();
	}

	startPing() {
		this._timeoutFunction = setTimeout(() => {
			this._bomb!.countDownStart();
			this._ws?.notify({
				type: 'heartbeatCheck',
				data: { msg: 'ping' },
			});
		}, 10 * 1000);
	}

	notify(sendData: any) {
		this._ws?.notify(sendData);
	}

	response(sendData: any) {
		this._ws?.response(sendData);
	}
}
