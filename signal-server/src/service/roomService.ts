import { Router, Request, Response } from 'express';
import { urlParse } from '../util/tool';
import { RoomController } from '../redis/controller';
import { ControllerFactory } from '../redis/ControllerFactory';
import { CryptoCore } from '../util/CryptoCore';
import { Log } from '../util/Log';
import { RoomCreator } from '../core/RoomCreator';
const express = require('express');

export class RoomService {
	private _roomController: RoomController;
	private _router: Router;
	private _roomCreator: RoomCreator;
	private _cryptoCore: CryptoCore;
	private log: Log = Log.GetInstance();
	constructor(rc: RoomCreator, cf: ControllerFactory, cryptoCore: CryptoCore) {
		this._roomCreator = rc;
		this._roomController = cf.getController('Room') as RoomController;
		this._cryptoCore = cryptoCore;

		this._router = express.Router();
		this._registerRouterHandler();
	}

	get router() {
		return this._router;
	}

	private _registerRouterHandler() {
		this._router.use((req: Request, res: Response, next: any) => {
			try {
				const parameter = urlParse(req.url, '/?id=([+/*<>=!#$%&"*+/=?^_~\'-\\w\\s\\d%]*)');
				const encrypted = this._cryptoCore.decipherIv(parameter);
				next();
			} catch (error: any) {
				res.status(403).json({
					msg: error.message,
				});
			}
		});
		this._router.get('/getRoomList', async (req: Request, res: Response) => {
			try {
				const temp_list = await this._roomController.getAllRoom();
				const roomList: Array<{
					roomId: string;
					roomName: string;
					roomUserSize: number;
				}> = [];
				const promiseList = temp_list.map((values: { id: string; name: string }) => {
					return new Promise<void>(async (resolve, reject) => {
						const roomDataList = await this._roomController.getAllRoomPlayerList(values.id);
						roomList.push({
							roomId: values.id,
							roomName: values.name,
							roomUserSize: roomDataList.length,
						});
						resolve();
					});
				});
				await Promise.all(promiseList);
				res.send(JSON.stringify(roomList));
			} catch (e) {
				console.log(e);
				res.status(403).json(e);
			}
		});
		this._router.post('/createRoom', async (req: Request, res: Response) => {
			try {
				const id = req.query.id as string;
				if (!req.body.room_name) {
					throw new Error('no input room_name parameters');
				}
				this.log.info('User [%s] create room [%s].', id, req.body.room_name);
				const room_id = req.body.room_name + '-' + Date.now();
				const r = await this._roomCreator.createRoom(id, room_id, req.body.room_name);
				if (r) {
					throw new Error('room has already exists');
				}
				res.send(
					JSON.stringify({
						msg: 'Successfully create!',
						room_id: room_id,
						room_name: req.body.room_name,
						room_peopleNum: 0,
					})
				);
			} catch (e: any) {
				this.log.error(e.message);
				res.status(403).json(e.message);
			}
		});
	}
}
