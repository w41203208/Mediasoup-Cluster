import { SFUConnectionManager } from '../core/SFUConnectionManager';
import { Log } from '../util/Log';
import { EVENT_FOR_SFU } from '../EVENT';

//temp
import { config } from '../../config';

interface SFUMessage {
	connectionServerId: string;
	roomId: string;
	data: Record<string, any>;
}

export class SFUService {
	private _sfuConnectionMgr: SFUConnectionManager;
	private log: Log = Log.GetInstance();
	constructor(sfuCMgr: SFUConnectionManager) {
		this._sfuConnectionMgr = sfuCMgr;
	}

	createRouter(msg: SFUMessage): Promise<any> {
		return new Promise(async (resolve, reject) => {
			const serverSocket = await this._sfuConnectionMgr.getOrNewSFUConnection(msg.connectionServerId, msg.roomId);
			const { data } = await serverSocket.request({
				data: {
					room_id: msg.roomId,
					mediaCodecs: config.MediasoupSetting.router.mediaCodecs,
				},
				type: EVENT_FOR_SFU.CREATE_ROUTER,
			});

			resolve(data);
		});
	}

	getRouterRtpCapabilities(msg: SFUMessage): Promise<any> {
		return new Promise(async (resolve, reject) => {
			const serversocket = await this._sfuConnectionMgr.getOrNewSFUConnection(msg.connectionServerId, msg.roomId);
			const { data } = await serversocket.request({
				data: {
					router_id: msg.data.routerId,
				},
				type: EVENT_FOR_SFU.GET_ROUTER_RTPCAPABILITIES,
			});
			resolve(data);
		});
	}

	createWebRTCTransport(msg: SFUMessage): Promise<any> {
		return new Promise(async (resolve, reject) => {
			try {
				const serversocket = await this._sfuConnectionMgr.getOrNewSFUConnection(msg.connectionServerId, msg.roomId);
				const { data } = await serversocket.request({
					data: {
						router_id: msg.data.routerId,
						consuming: msg.data.consuming,
						producing: msg.data.producing,
					},
					type: EVENT_FOR_SFU.CREATE_WEBRTCTRANSPORT,
				});
				resolve(data);
			} catch (e: any) {
				this.log.error(`${e.message}`);
				reject(e);
			}
		});
	}

	connectWebRTCTransport(msg: SFUMessage): Promise<any> {
		return new Promise(async (resolve, reject) => {
			try {
				const serversocket = await this._sfuConnectionMgr.getOrNewSFUConnection(msg.connectionServerId, msg.roomId);
				const { data } = await serversocket.request({
					type: EVENT_FOR_SFU.CONNECT_WEBRTCTRANPORT,
					data: {
						router_id: msg.data.routerId,
						transport_id: msg.data.transportId,
						dtlsParameters: msg.data.dtlsParameters,
					},
				});
				resolve(data);
			} catch (e: any) {
				this.log.error(`${e.message}`);
				reject(e);
			}
		});
	}

	createProduce(msg: SFUMessage): Promise<any> {
		return new Promise(async (resolve, reject) => {
			try {
				const serversocket = await this._sfuConnectionMgr.getOrNewSFUConnection(msg.connectionServerId, msg.roomId);
				const { data } = await serversocket.request({
					type: EVENT_FOR_SFU.CREATE_PRODUCE,
					data: {
						router_id: msg.data.routerId,
						transport_id: msg.data.transportId,
						rtpParameters: msg.data.rtpParameters,
						rtpCapabilities: msg.data.rtpCapabilities,
						kind: msg.data.kind,
					},
				});
				resolve(data);
			} catch (e: any) {
				this.log.error(`${e.message}`);
				reject(e);
			}
		});
	}

	createConsume(msg: SFUMessage): Promise<any> {
		return new Promise(async (resolve, reject) => {
			try {
				const serversocket = await this._sfuConnectionMgr.getOrNewSFUConnection(msg.connectionServerId, msg.roomId);
				const { data } = await serversocket.request({
					type: EVENT_FOR_SFU.CREATE_CONSUME,
					data: {
						router_id: msg.data.routerId,
						transport_id: msg.data.transportId,
						rtpCapabilities: msg.data.rtpCapabilities,
						producers: msg.data.producers,
					},
				});
				resolve(data);
			} catch (e: any) {
				this.log.error(`${e.message}`);
				reject(e);
			}
		});
	}

	closeWebRTCTransport(msg: SFUMessage): Promise<void> {
		return new Promise(async (resolve, reject) => {
			const serverSocket = await this._sfuConnectionMgr.getOrNewSFUConnection(msg.connectionServerId, msg.roomId);
			await serverSocket.request({
				data: {
					sendTransport_id: msg.data.sendTransport === null ? null : msg.data.sendTransport.id,
					recvTransport_id: msg.data.recvTransport === null ? null : msg.data.recvTransport.id,
				},
				type: EVENT_FOR_SFU.CLOSE_TRANSPORT,
			});
			resolve();
		});
	}

	// temp
	// maybe can seperate two function
	connectTwoSFUServer(msg: SFUMessage): Promise<void> {
		return new Promise(async (resolve, reject) => {
			const localServerSocket = await this._sfuConnectionMgr.getOrNewSFUConnection(msg.connectionServerId, msg.roomId);
			const remoteServerSocket = await this._sfuConnectionMgr.getOrNewSFUConnection(msg.data.remoteServerId, msg.roomId);
			const [remoteConnectionData, localConnectionData] = await Promise.all([
				remoteServerSocket.request({
					data: {
						server_id: msg.data.localServerId,
						mediaCodecs: config.MediasoupSetting.router.mediaCodecs,
					},
					type: EVENT_FOR_SFU.CREATE_PIPETRANSPORT,
				}),
				localServerSocket.request({
					data: {
						server_id: msg.data.remoteServerId,
						mediaCodecs: config.MediasoupSetting.router.mediaCodecs,
					},
					type: EVENT_FOR_SFU.CREATE_PIPETRANSPORT,
				}),
			]);
			const { transport_id: remoteTransportId, state: remoteState, ...remoteRest } = remoteConnectionData.data;
			const { transport_id: localTransportId, state: localState, ...localRest } = localConnectionData.data;
			const promiseList = [];
			if (!remoteState) {
				promiseList.push(
					remoteServerSocket.request({
						data: {
							server_id: msg.data.localServerId,
							...localRest,
						},
						type: EVENT_FOR_SFU.CONNECT_PIPETRANSPORT,
					})
				);
			}
			if (!localState) {
				promiseList.push(
					localServerSocket.request({
						data: {
							server_id: msg.data.remoteServerId,
							...remoteRest,
						},
						type: EVENT_FOR_SFU.CONNECT_PIPETRANSPORT,
					})
				);
			}
			await Promise.all(promiseList);
			this.log.debug('Join Room Finanlly!!!!!');
			resolve();
		});
	}

	createPipeTransportProduce(msg: SFUMessage): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				const serversocket = await this._sfuConnectionMgr.getOrNewSFUConnection(msg.connectionServerId, msg.roomId);
				await serversocket.request({
					type: EVENT_FOR_SFU.CREATE_PIPETRANSPORT_PRODUCE,
					data: {
						server_id: msg.data.serverId,
						consumerMap: msg.data.consumerMap,
					},
				});
				resolve();
			} catch (e: any) {
				this.log.error(`${e.message}`);
				reject(e);
			}
		});
	}

	createPipeTransportConsume(msg: SFUMessage): Promise<any> {
		return new Promise(async (resolve, reject) => {
			try {
				const serversocket = await this._sfuConnectionMgr.getOrNewSFUConnection(msg.connectionServerId, msg.roomId);
				const { data } = await serversocket.request({
					type: EVENT_FOR_SFU.CREATE_PIPETRANSPORT_CONSUME,
					data: {
						server_id: msg.data.serverId,
						producerMap: msg.data.producerMap,
					},
				});
				resolve(data);
			} catch (e: any) {
				this.log.error(`${e.message}`);
				reject(e);
			}
		});
	}
	async setPreferredLayers(msg: SFUMessage): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				const serversocket = await this._sfuConnectionMgr.getOrNewSFUConnection(msg.connectionServerId, msg.roomId);
				await serversocket.request({
					type: EVENT_FOR_SFU.SET_PREFERRED_LAYERS,
					data: {
						consumer_id: msg.data.consumer_id,
						spatialLayer: msg.data.spatialLayer,
					},
				});
				resolve();
			} catch (e: any) {
				this.log.error(`${e.message}`);
				reject(e);
			}
		});
	}
}
