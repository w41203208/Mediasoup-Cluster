import express from 'express';
import cors from 'cors';
import { Application, Request, Response } from 'express';
import { createServer } from 'https';
import { HttpsServerOptions, sslOption } from '../type.engine';
import bodyParser from 'body-parser';
import { CryptoCore } from '../util/CryptoCore';
import { Log } from '../util/Log';
import { RoomService, AuthService } from '../service/index';

interface ServiceInterface {
	roomService: RoomService;
	authService: AuthService;
}

export class HttpsServer {
	private _ip: string;
	private _port: number;
	private _ssl: sslOption;

	private services: ServiceInterface;
	private app?: Application;
	private cryptoCore: CryptoCore;

	private log: Log = Log.GetInstance();

	constructor({ ip, port, ssl }: HttpsServerOptions, cryptoCore: CryptoCore, roomService: RoomService, authService: AuthService) {
		this._ip = ip;
		this._port = port;
		this._ssl = ssl;

		this.services = {
			roomService: roomService,
			authService: authService,
		};
		this.cryptoCore = cryptoCore;
	}

	run() {
		const app = express();
		app.use(cors());
		app.use(bodyParser.json());

		this.app = app;

		this.app.use('/room', this.services.roomService.router);
		this.app.use('/auth', this.services.authService.router);
		this._registerAppHandler();

		return this;
	}

	runToHttps() {
		const httpsServer = createServer(this._ssl, this.app);

		const server = httpsServer.listen(this._port, this._ip, () => {
			this.log.info('Server is listening at https://%s:%s', this._ip, this._port);
		});

		return server;
	}

	private _registerAppHandler() {
		if (this.app) {
			this.app.get('/new_sfu_server', (req: Request, res: Response) => {
				res.send(`${this._port}`);
			});
			this.app.get('/test', async (req: Request, res: Response) => {
				res.send('test');
			});
		}
	}
}
