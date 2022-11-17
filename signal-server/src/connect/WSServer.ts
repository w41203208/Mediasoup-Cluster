const ws = require('ws');
import { WebSocket } from 'ws';
import { Server } from 'https';

import { WSTransport } from './WSTransport';

import { CryptoCore } from '../util/CryptoCore';
import { EventEmitter } from '../util/emitter';
import { parse } from '../util/tool';
import { TimeBomb } from '../util/TimeBomb';
import { Log } from '../util/Log';

import { PeerRouter } from '../router/peerRouter';
import { MEvent } from '../router/event';
import { PeerSubscriber } from '../router/subscriber';

import { Peer } from '../core/Peer';
import { ClientConnectionManager } from '../core/ClientConnectionManager';
import { SFUAllocator } from '../core/SFUAllocator';
import { Request } from 'express';

export class WSServer extends EventEmitter {
	private cryptoCore: CryptoCore;
	private ccMgr: ClientConnectionManager;
	private _sfuAllocator: SFUAllocator;

	private log: Log = Log.GetInstance();
	constructor(httpsServer: Server, cryptoCore: CryptoCore, ccmgr: ClientConnectionManager, sa: SFUAllocator, pr: PeerRouter) {
		super();
		this.ccMgr = ccmgr;
		this.cryptoCore = cryptoCore;
		this._sfuAllocator = sa;
		const wsServer = new ws.Server({ noServer: true });

		wsServer.on('open', () => {
			console.log('Websocket is connected');
		});

		httpsServer.on('upgrade', (request: Request, socket: any, head: any) => {
			wsServer.handleUpgrade(request, socket, head, async (ws: WebSocket) => {
				try {
					const connectionPKey = parse(request.url);
					this.cryptoCore.decipherIv(connectionPKey.peerId);
					const transport = new WSTransport(ws);
					const peer = new Peer(connectionPKey, transport);
					peer.handleTransportMessage(pr);
					this.ccMgr.setPeer(peer);

					// 分配 sfu server ip and port
					const sfuAllocateIpPort = await sa.getMinimumSFUServer();
					if (sfuAllocateIpPort === undefined) {
						throw new Error('Server is full');
					}

					// pub join room event to roommanager
					pr.publish(
						new MEvent(
							{ identity: connectionPKey.peerId, roomId: connectionPKey.roomId, message: { type: 'joinRoom', sfuIpPort: sfuAllocateIpPort } },
							'rtc'
						)
					);
					const bomb = new TimeBomb(10 * 1000, () => {
						pr.publish(
							new MEvent(
								{ identity: connectionPKey.peerId, roomId: connectionPKey.roomId, message: { type: 'removePlayer', sfuIpPort: sfuAllocateIpPort } },
								'rtc'
							)
						);
					});
					peer.setTimeBomb(bomb);

					// wsServer.emit('connection', ws, request);
				} catch (e: any) {
					ws.send(
						JSON.stringify({
							msg: e.message,
						})
					);
					ws.close();
					this.log.error(e.message);
				}
			});
		});

		const peerSubscriber = new PeerSubscriber();
		pr.subscribe('signal', peerSubscriber);
		peerSubscriber.OnHandleSignalMesssage(this.handleSignalMessage.bind(this));

		// wsServer.on('connection', (ws: WebSocket, incomingMessage: IncomingMessage) => {
		//   try {
		//     this.log.debug('Someone connect in this server!');
		//   } catch (err) {
		//     ws.close();
		//     console.log(err);
		//   }
		// });
	}

	async handleSignalMessage(pmessage: any) {
		try {
			const peer = this.ccMgr.getPeer(pmessage.connectionId);
			if (!peer) {
				throw new Error('no peer');
			}
			switch (pmessage.ptype) {
				case 'response':
					peer.response(pmessage);
					break;
				case 'notification':
					peer.notify(pmessage);
					break;
				case 'end_session':
					await this._sfuAllocator.misallocateSFUServer(pmessage.data.serverId);
					this.ccMgr.delPeer(pmessage.connectionId);
					peer.died();
					break;
			}
		} catch (e: any) {
			this.log.error(e.message);
		}
	}
}
