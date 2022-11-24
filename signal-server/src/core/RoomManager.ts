import { v4 } from 'uuid';

import { ControllerFactory } from '../redis/ControllerFactory';
import { RoomController } from '../redis/controller';

import { Room } from './Room';
import { Player } from './Player';
import { RoomRouter } from './RoomRouter';
import { SFUService } from '../service';
import { EVENT_FOR_CLIENT_NOTIFICATION, EVENT_FROM_CLIENT_REQUEST, EVENT_PUBLISH } from '../EVENT';

import { Log } from '../util/Log';
import { getLocalIp } from '../util/tool';

// import { PubHandlerMapData, DataJoinRoom, PubHandlerType } from './type.roommanager';
import { PeerRouter } from '../router/peerRouter';
import { RoomManagerSubscriber } from '../router/subscriber';
import { MEvent } from '../router/event';

// add pubRoomID and pubPlayerID
interface PubHandlerMapData {
	count: number;
	type: string;
	data: Record<string, any>;
}

// Message type
interface RMessage {
	id: string;
	type: string;
	data: any;
}
interface SubMessage {
	identifyIp: string;
	type: string;
	data: Record<string, any>;
}

// eslint-disable-next-line no-unused-vars
enum PubHandlerType {
	// eslint-disable-next-line no-unused-vars
	GETPRODUCER_COMPLETE = 'getProducerComplete',
}

export class RoomManager {
	private _ip: string = getLocalIp();
	private RoomController: RoomController;

	private _sfuService: SFUService;
	private _roomRouter: RoomRouter;
	private _peerRouter: PeerRouter;

	private _roomMap: Map<string, Room>;
	private _pubHandlerMap: Map<string, PubHandlerMapData>;

	private _roomManagerSub: RoomManagerSubscriber;

	private log: Log = Log.GetInstance();

	// private onCloseRoom: Function = (player: Player, roomId: string) => {};

	constructor(cf: ControllerFactory, rr: RoomRouter, pr: PeerRouter, ss: SFUService) {
		this.RoomController = cf.getController('Room') as RoomController;
		this._roomMap = new Map();
		this._pubHandlerMap = new Map();

		this._sfuService = ss;
		this._roomRouter = rr;
		this._roomRouter.on('handleOnRoom', (message: any) => {
			this.handlePubMessage(message);
		});
		this._peerRouter = pr;

		this._roomManagerSub = new RoomManagerSubscriber();
		this._peerRouter.subscribe('rtc', this._roomManagerSub);
		this._roomManagerSub.OnHandleRTCMessage(this.handleRTCMessage.bind(this));
		this._roomManagerSub.OnNewPlayerJoinRTC(this.newPlayerJoinRTC.bind(this));
	}
	handlePubMessage(msg: SubMessage) {
		const { type, data, identifyIp } = msg;
		switch (type) {
			case EVENT_PUBLISH.CREATE_PIPETRANSPORT_CONSUME:
				this.handlePubCreatePipeTransportConsumer(data, identifyIp);
				break;
			case EVENT_PUBLISH.CREATE_CONSUME:
				this.handlePubCreateConsumer(data);
				break;
			case EVENT_PUBLISH.EVENT_EXECUTE_COMPLETE:
				if (identifyIp === this._ip) {
					this.handlePubExecuteComplete(data);
				}
				break;
		}
	}
	async handlePubCreateConsumer(data: any) {
		try {
			const peerOfServerMap = await this.createPlayerConsumer_Pub(data.pubRoomId, data.pubPlayerId, data.producerId);
			console.log('peerOfServerMap: ', peerOfServerMap);
			Object.entries(peerOfServerMap).forEach(([key, value]: [key: string, value: any]) => {
				value.forEach(async (v: any) => {
					if (v.player.recvTransport) {
						const rData = await this._sfuService.createConsume({
							connectionServerId: key,
							roomId: data.pubRoomId,
							data: {
								routerId: v.player.routerId,
								transportId: v.player.recvTransport.id,
								rtpCapabilities: v.player.rtpCapabilities,
								producers: v.producerList,
							},
						});
						const { new_consumerList } = rData;

						// eslint-disable-next-line quotes
						this.log.debug(`return new_consumerList: `, new_consumerList);

						this.publish(v.player.id, { type: EVENT_FOR_CLIENT_NOTIFICATION.NEW_CONSUMER }, 'notification', {
							consumerList: new_consumerList,
						});
					}
				});
			});
		} catch (e: any) {
			this.log.error(e);
		}
	}
	async handlePubCreatePipeTransportConsumer(data: any, identifyIp: string) {
		const producerMaps = this.createPlayerPipeTransportConsumer_Pub(
			data.pubRoomId,
			data.pubPlayerId,
			data.ignoreServerId,
			data.pubHandlerMapId,
			identifyIp
		);
		if (Object.keys(producerMaps).length === 0) {
			return;
		}

		const promises = Object.entries(producerMaps).map(([key, value]: [key: string, value: any]) => {
			const kkey = key;

			// eslint-disable-next-line no-unused-vars
			return new Promise<void>(async (resolve, reject) => {
				const rData = await this._sfuService.createPipeTransportConsume({
					connectionServerId: key, // 要輸入欲創建的 sfu server 要對應創建的 sfu server 的 serverID
					roomId: data.pubRoomId,
					data: {
						serverId: data.ignoreServerId,
						producerMap: value,
					},
				});
				const { consumerMap } = rData;
				Object.entries(consumerMap).map(async ([key, value]) => {
					await this._sfuService.createPipeTransportProduce({
						connectionServerId: key,
						roomId: data.pubRoomId,
						data: {
							serverId: kkey,
							consumerMap: value,
						},
					});
					resolve();
				});
			});
		});
		await Promise.all(promises);

		this.executeComplete_Pub(data.pubRoomId, data.pubHandlerMapId, identifyIp);
	}

	async handlePubExecuteComplete(data: any) {
		const handler = this.getPubHandlerMap(data.pubHandlerMapId);
		if (handler === undefined) {
			return;
		}
		switch (handler.type) {
			case PubHandlerType.GETPRODUCER_COMPLETE:
				this.handleGetProducerComplete(handler.data);
				break;
			default:
				break;
		}
	}
	async handleGetProducerComplete(data: any) {
		try {
			const room = this._roomMap.get(data.handlerRoomId)!;
			const player = room.getPlayer(data.handlerPlayerId);
			const producerList = await this.RoomController.getRoomProducerList(data.handlerRoomId);

			player.recvTransports.forEach(async (t: any) => {
				const rData = await this._sfuService.createConsume({
					connectionServerId: player.serverId,
					roomId: data.handlerRoomId,
					data: {
						routerId: player.routerId,
						transportId: t.id,
						rtpCapabilities: player.rtpCapabilities,
						producers: producerList,
					},
				});
				this.publish(player.id, { type: EVENT_FOR_CLIENT_NOTIFICATION.NEW_CONSUMER }, 'notification', {
					consumerList: rData.new_consumerList,
					transport_id: t.id,
				});
			});
		} catch (e: any) {
			this.log.error(e.message);
		}
	}

	// 與 Room 有關
	async getOrCreateRoom(roomId: string): Promise<Room> {
		return new Promise(async (resolve, reject) => {
			try {
				const rRoom = await this.RoomController.getRoom(roomId);

				if (!rRoom) {
					throw new Error('room is not exist!');
				}

				if (!this._roomMap.has(roomId)) {
					const newRoom = new Room({
						roomId: rRoom.id,
						roomName: rRoom.name,
						roomOwner: rRoom.owner,
					});
					this._roomRouter.register(roomId);

					newRoom.OnClose(async () => {
						this.log.debug('Room [%s] is closing', newRoom.id);
						this._roomMap.delete(newRoom.id);
						this.RoomController.delRoom(newRoom.id);
						this.RoomController.clearRoomServerList(newRoom.id);

						newRoom.OnClose(null);
						newRoom.OnPublishTrack(null);
					});

					newRoom.OnPublishTrack((playerId: string, producerId: string) => {
						this.log.debug('Has PlayerId publish track! ', playerId);
						this.RoomController.setRoomProducerList(roomId, producerId);
						this._roomRouter.publish(roomId, {
							identifyIp: getLocalIp(),
							type: EVENT_PUBLISH.CREATE_CONSUME,
							data: {
								pubPlayerId: playerId,
								pubRoomId: newRoom.id,
								producerId: producerId,
							},
						});
					});

					this._roomMap.set(roomId, newRoom);
				}

				const room = this._roomMap.get(roomId);

				if (room) {
					resolve(room);
				} else {
					reject(room);
				}
			} catch (e: any) {
				this.log.error(e.message);
			}
		});
	}
	async newPlayerJoinRTC(identity: string, roomId: string, rm: { sfuIpPort: string }) {
		try {
			const room = await this.getOrCreateRoom(roomId);
			let player = room.getPlayer(identity);

			//
			if (player) {
				this.log.debug('player has been exsit so to delete it');
				room.removePlayer(player.id);
			}

			await this.RoomController.setRoomServerList(roomId, rm.sfuIpPort);

			// 創建 mediasoup router
			const data = await this._sfuService.createRouter({
				connectionServerId: rm.sfuIpPort,
				roomId: roomId,
				data: {},
			});

			this.log.info('User [%s] get router [%s]', identity, data.router_id);

			const roomData = await this.RoomController.getRoom(roomId);
			player = new Player(identity, '', rm.sfuIpPort, data.router_id, roomData.owner === identity ? 'owner' : 'audience');

			player.OnClose(async () => {
				this.log.warn('To close websocket');
				const promiseList = [];
				promiseList.push(this.RoomController.delRoomPlayerList(room.id, player.id));
				player.producers.forEach(async (v: any) => {
					promiseList.push(this.RoomController.delRoomProducerList(roomId, v.id));
				});

				if (player.sendTransport) {
					promiseList.push(
						this._sfuService.closeWebRTCTransport({
							connectionServerId: player.serverId,
							roomId: roomId,
							data: { id: player.sendTransport.id },
						})
					);
				}

				if (player.recvTransports.length !== 0) {
					player.recvTransports.forEach((t: any) => {
						promiseList.push(
							this._sfuService.closeWebRTCTransport({
								connectionServerId: player.serverId,
								roomId: roomId,
								data: { id: t.id },
							})
						);
					});
				}

				await Promise.all(promiseList);

				const rPlayers = await this.RoomController.getAllRoomPlayerList(room.id);
				if (rPlayers.length === 0) {
					room.close();
				}

				this._peerRouter.publish(
					new MEvent(
						{
							connectionId: identity,
							ptype: 'end_session',
							data: {
								serverId: player.serverId,
							},
						},
						'signal'
					)
				);
			});

			room.join(player);

			this.RoomController.setRoomPlayerList(roomId, player.id);

			const serverList = await this.RoomController.getRoomServerList(roomId);
			const localServerSocketId = rm.sfuIpPort;
			const remoteServerSocketIdList = serverList.filter((serverId: string) => serverId !== localServerSocketId);

			// maybe will happen something wrong about async
			if (remoteServerSocketIdList.length !== 0) {
				remoteServerSocketIdList.forEach((serverId: string) => {
					this._sfuService.connectTwoSFUServer({
						connectionServerId: localServerSocketId,
						roomId: roomId,
						data: {
							localServerId: localServerSocketId,
							remoteServerId: serverId,
						},
					});
				});
			}

			this.log.info('Player [%s] is joined in room [%s]!', identity, roomId);

			this.publish(identity, { type: EVENT_FOR_CLIENT_NOTIFICATION.JOIN_ROOM }, 'notification', {
				room_id: roomId,
				userRole: player.role,
				sfu: rm.sfuIpPort,
			});
		} catch (e: any) {
			this.log.error(e.message);
			this.publish(identity, { type: EVENT_FOR_CLIENT_NOTIFICATION.JOIN_ROOM }, 'notification', {
				status: false,
				error: 'happen some error',
			});
		}
	}
	createPlayerPipeTransportConsumer_Pub(roomId: string, peerId: string, ignoreServerId: string, pubHandlerMapId: string, identifyIp: string) {
		const room = this._roomMap.get(roomId)!;
		const localPlayerList = room.getJoinedPlayerList({ excludePlayer: {} as Player });
		const producerMaps: Record<string, any> = {};
		localPlayerList.forEach((player: Player) => {
			if (player.serverId !== ignoreServerId) {
				const sid = player.serverId!;
				if (producerMaps[sid] === undefined) {
					producerMaps[sid] = {};
				}
				const rid = player.routerId!;
				if (producerMaps[sid][rid] === undefined) {
					producerMaps[sid][rid] = [];
				}
				player.producers.forEach((producer: any) => {
					producerMaps[sid][rid].push({ producerId: producer.id, rtpCapabilities: player.rtpCapabilities });
				});
			}
		});

		// 如果 producerMap is null，代表沒有需要連到其他不同台 sfu server 去建立連線資訊的動作
		if (Object.keys(producerMaps).length === 0) {
			this.executeComplete_Pub(roomId, pubHandlerMapId, identifyIp);
		}
		return producerMaps;

		// const room = this._roomMap.get(roomId)!;
		// const localPlayerList = room.getJoinedPlayerList({ excludePlayer: {} as Player });
		// let producerMaps: Record<string, any> = {};
		// let num = 0;
		// localPlayerList.forEach((player: Player) => {
		//   if (player.serverId !== ignoreServerId) {
		//     const sid = player.serverId!;
		//     if (producerMaps[sid] === undefined) {
		//       producerMaps[sid] = {};
		//     }
		//     const rid = player.routerId!;
		//     if (producerMaps[sid][rid] === undefined) {
		//       producerMaps[sid][rid] = [];
		//     }
		//     player.producers.forEach((producer: any) => {
		//       num++;
		//       producerMaps[sid][rid].push({ producerId: producer.id, rtpCapabilities: player.rtpCapabilities });
		//     });
		//   }
		// });

		// // 如果 producerMap is null，代表沒有需要連到其他不同台 sfu server 去建立連線資訊的動作
		// if (num === 0) {
		//   this.executeComplete_Pub(roomId, pubHandlerMapId, identifyIp);
		//   return num;
		// }
		// return producerMaps;
	}

	// `tag` maybe like livekit room.onTrackPublished method, can to 參考
	async createPlayerConsumer_Pub(roomId: string, peerId: string, producerId: string) {
		const room = this._roomMap.get(roomId)!;

		// 將 [peer, peer, peer] => { serverId : [peer, peer, peer] }
		const localPlayerList = room.getJoinedPlayerList({ excludePlayer: peerId });
		const playerOfServerMap = {} as any;
		localPlayerList.forEach((player) => {
			if (!playerOfServerMap[player.serverId!]) {
				playerOfServerMap[player.serverId!] = [];
			}
			playerOfServerMap[player.serverId!].push({ player: player, producerList: [producerId] });
		});

		return playerOfServerMap;
	}

	executeComplete_Pub(roomId: string, pubHandlerMapId: string, identifyIp: string) {
		this._roomRouter.publish(roomId, {
			identifyIp: identifyIp,
			type: EVENT_PUBLISH.EVENT_EXECUTE_COMPLETE,
			data: {
				pubHandlerMapId: pubHandlerMapId,
			},
		});
	}

	getPubHandlerMap(pubHandlerMapId: string) {
		const handler = this._pubHandlerMap.get(pubHandlerMapId)!;
		if (handler.count > 0) {
			handler.count--;
		}
		if (handler.count === 0) {
			this._pubHandlerMap.delete(pubHandlerMapId);
			return handler;
		}
	}

	async handleRTCMessage(identity: string, roomId: string, rm: RMessage) {
		try {
			const room = this._roomMap.get(roomId)!;

			// 這邊還要確認會不會發生沒有 room 的問題
			if (!room) {
				this.RoomController.delRoom(roomId);
				this.log.warn('Room is not exist in this signal server');
			}

			const player = room?.getPlayer(identity);

			if (!player) {
				throw new Error('no new player');
			}

			switch (rm.type) {
				case EVENT_FROM_CLIENT_REQUEST.GET_ROUTER_RTPCAPABILITIES:
					this.handleGetRouterRtpCapabilities(player, room, rm);
					break;
				case EVENT_FROM_CLIENT_REQUEST.CLOSE_ROOM:
					this.handleCloseRoom(player, room, rm);
					break;
				case EVENT_FROM_CLIENT_REQUEST.LEAVE_ROOM:
					this.handleLeaveRoom(player, room, rm);
					break;
				case EVENT_FROM_CLIENT_REQUEST.CREATE_WEBRTCTRANSPORT:
					this.handleCreateWebRTCTransport(player, room, rm);
					break;
				case EVENT_FROM_CLIENT_REQUEST.CONNECT_WEBRTCTRANPORT:
					this.handleConnectWebRTCTransport(player, room, rm);
					break;
				case EVENT_FROM_CLIENT_REQUEST.PRODUCE:
					this.handleProduce(player, room, rm);
					break;
				case EVENT_FROM_CLIENT_REQUEST.GET_PRODUCERS:
					this.handleGetProduce(player, room, rm);
					break;
				case 'removePlayer':
					this.handleRemovePlayer(player, room);
					break;
				case EVENT_FROM_CLIENT_REQUEST.SET_PREFERRED_LAYERS:
					this.handlePreferredLayers(player, room, rm);
					break;
			}
		} catch (e: any) {
			this.log.error(e);
		}
	}

	async handlePreferredLayers(player: Player, room: Room, rm: RMessage) {
		try {
			this._sfuService.setPreferredLayers({
				connectionServerId: player.serverId,
				roomId: room.id,
				data: {
					consumer_id: rm.data.consumer_id,
					spatialLayer: rm.data.spatialLayer,
				},
			});
		} catch (e: any) {
			this.log.error(e.message);
		}
	}

	async handleRemovePlayer(player: Player, room: Room) {
		try {
			room.removePlayer(player.id);
		} catch (e: any) {
			this.log.error(e.message);
		}
	}

	async handleCloseRoom(player: Player, room: Room, rm: RMessage) {
		try {
			const rRoom = await this.RoomController.getRoom(room.id);
			if (rRoom.owner !== player.id) {
				this.log.warn('Player [%s] is not roomowner', player.id);
			}
			this.log.info('Room [%s] is closed.', room.id);
			room.close();
			this.publish(player.id, rm, 'response', { status: true });
		} catch (e: any) {
			this.log.error(e.message);
		}
	}

	async handleLeaveRoom(player: Player, room: Room, rm: RMessage) {
		try {
			this.log.info('User [%s] leave room [%s].', player.id, room.id);
			room.removePlayer(player.id);

			this.publish(player.id, rm, 'response', { status: true });
		} catch (e: any) {
			this.log.error(e.message);
		}
	}

	async handleGetRouterRtpCapabilities(player: Player, room: Room, rm: RMessage) {
		try {
			const data = await this._sfuService.getRouterRtpCapabilities({
				connectionServerId: player.serverId,
				roomId: room.id,
				data: {
					routerId: player.routerId,
				},
			});

			this.publish(player.id, rm, 'response', { status: true, codecs: data.mediaCodecs });
		} catch (e: any) {
			this.log.error(`${e.message}`);
		}
	}

	async handleCreateWebRTCTransport(player: Player, room: Room, rm: RMessage) {
		try {
			const data = await this._sfuService.createWebRTCTransport({
				connectionServerId: player.serverId,
				roomId: room.id,
				data: {
					routerId: player.routerId,
					consuming: rm.data.consuming,
					producing: rm.data.producing,
				},
			});
			player.addTransport(data.transport_id, data.transportType);
			this.log.info('Player [%s] createWebRTCTransport [%s] type is [%s]', player.id, data.transport_id, data.transportType);

			this.publish(player.id, rm, 'response', data);
		} catch (e: any) {
			this.log.error(`${e.message}`);
		}
	}

	async handleConnectWebRTCTransport(player: Player, room: Room, rm: RMessage) {
		try {
			const data = await this._sfuService.connectWebRTCTransport({
				connectionServerId: player.serverId,
				roomId: room.id,
				data: {
					routerId: player.routerId,
					transportId: rm.data.transport_id,
					dtlsParameters: rm.data.dtlsParameters,
				},
			});
			this.log.debug('Player [%s] connect webrtctransport [%s]', player.id, rm.data.transport_id);
			this.publish(player.id, rm, 'response', data);
		} catch (e: any) {
			this.log.error(`${e.message}`);
		}
	}

	async handleProduce(player: Player, room: Room, rm: RMessage) {
		const data = await this._sfuService.createProduce({
			connectionServerId: player.serverId,
			roomId: room.id,
			data: {
				routerId: player.routerId,
				transportId: player.sendTransport.id,
				rtpParameters: rm.data.rtpParameters,
				rtpCapabilities: player.rtpCapabilities,
				kind: rm.data.kind,
			},
		});
		const { producer_id, consumerMap } = data;
		this.log.info('User [%s] use webrtcTransport [%s] produce [%s].', player.id, player.sendTransport.id, producer_id);

		const promises = Object.entries(consumerMap).map(([key, value]: [key: string, value: any]): Promise<any> => {
			// eslint-disable-next-line no-unused-vars
			return new Promise<void>(async (resolve, reject) => {
				await this._sfuService.createPipeTransportProduce({
					connectionServerId: key,
					roomId: room.id,
					data: {
						serverId: player.serverId,
						consumerMap: value,
					},
				});
				resolve();
			});
		});
		await Promise.all(promises);

		player.produce(producer_id);

		this.publish(player.id, rm, 'response', {
			producer_id: producer_id,
		});
	}

	async handleGetProduce(player: Player, room: Room, rm: RMessage) {
		if (player.recvTransports.length !== 0) {
			player.rtpCapabilities = rm.data.rtpCapabilities;
			const currentOtherSignalCount = await this.RoomController.getRoomSubscriberNum(room.id);
			const mapId = v4();
			this._pubHandlerMap.set(mapId, {
				count: currentOtherSignalCount,
				type: PubHandlerType.GETPRODUCER_COMPLETE,
				data: {
					handlerPlayerId: player.id,
					handlerRoomId: room.id,
				},
			});
			this._roomRouter.publish(room.id, {
				identifyIp: getLocalIp(),
				type: EVENT_PUBLISH.CREATE_PIPETRANSPORT_CONSUME,
				data: {
					pubPlayerId: player.id,
					pubRoomId: room.id,
					ignoreServerId: player.serverId,
					pubHandlerMapId: mapId,
				},
			});
		}
		this.publish(player.id, rm, 'response', {});
	}

	publish(cid: string, rm: any = {}, ptype: string, data: any) {
		this._peerRouter.publish(
			new MEvent({ connectionId: cid, id: rm.id ? rm.id : null, ptype: ptype, type: rm.type ? rm.type : null, data: data }, 'signal')
		);
	}
}
