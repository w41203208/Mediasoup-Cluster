import WebSocket from 'ws';
import { EventEmitter } from '../util/emitter';

require('dotenv').config();

interface WSTransportRequestMessage {
	id: string;
	type: string;
	data: any;
}

interface WSTransportResponseMessage {
	id: string;
	type: string;
	data: any;
}

export class WSTransport extends EventEmitter {
	private _socket: WebSocket | null;

	private _flightSend: Map<string, any>;

	constructor(socket: WebSocket) {
		super();

		this._socket = socket;

		this._flightSend = new Map();

		this._handleSocketConnection();
	}
	sendData(data: any) {
		this._socket!.send(JSON.stringify({ ...data }));
	}

	_handleSocketConnection() {
		this._socket!.on('close', () => {
			console.log('socket is closed');
		});
		this._socket!.on('message', (message: any) => {
			const jsonMessage = JSON.parse(message);
			const { messageType, ...rest } = jsonMessage;
			switch (messageType) {
				case 'request':
					this._handlerRequest(rest);
					break;
				case 'response':
					this._handlerResponse();
					break;
				case 'notification':
					this._handlerNotification(rest);
					break;
			}
		});
	}

	_handlerRequest(request: any) {
		const stamp = Date.now().toString();

		const response = (sendData: any) => {
			sendData.messageType = 'response';
			sendData.id = request.id;
			this.sendData(sendData);
		};

		this._flightSend.set(stamp, response);
		const peerMsg: WSTransportRequestMessage = {
			id: stamp,
			data: request.data,
			type: request.type,
		};
		this.emit('request', peerMsg);
	}
	_handlerResponse() {}
	_handlerNotification(notification: any) {
		this.emit('notification', notification);
	}

	response(responseMsg: WSTransportResponseMessage) {
		const response = this._flightSend.get(responseMsg.id);

		this._flightSend.delete(responseMsg.id);

		response({
			data: responseMsg.data,
			type: responseMsg.type,
		});
	}

	notify(sendData: any) {
		this.sendData({
			messageType: 'notification',
			type: sendData.type,
			data: sendData.data,
		});
	}

	close() {
		console.log('To close socket');
		this._socket!.close();

		this._socket = null;
	}
}
