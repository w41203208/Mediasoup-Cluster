import { ServerEngine } from '../src/engine';
const fs = require('fs');
const path = require('path');

describe('Engine', () => {
	const config = {
		ServerSetting: {
			listenIp: process.env.DOMAIN!,
			listenPort: Number(process.env.PORT),
			sslCert: '../ssl/cert.pem',
			sslKey: '../ssl/key.pem',
			cryptoKey: process.env.CRYPTO_KEY!,
			redisHost: process.env.REDIS_HOST!,
			redisDBIndex: process.env.REDIS_DB_INDEX!,
		},
		MediasoupSetting: {
			router: {
				mediaCodecs: [
					{
						kind: 'audio',
						mimeType: 'audio/opus',
						clockRate: 48000,
						channels: 2,
					},
					{
						kind: 'video',
						mimeType: 'video/VP8',
						clockRate: 90000,
						parameters: {
							'x-google-start-bitrate': 1000,
						},
					},
					{
						kind: 'video',
						mimeType: 'video/h264',
						clockRate: 90000,
						parameters: {
							'packetization-mode': 1,
							'profile-level-id': '640032',
							'level-asymmetry-allowed': 1,
							'x-google-start-bitrate': 1000,
						},
					},
					{
						kind: 'video',
						mimeType: 'video/h264',
						clockRate: 90000,
						parameters: {
							'packetization-mode': 1,
							'profile-level-id': '4d0032',
							'level-asymmetry-allowed': 1,
							'x-google-start-bitrate': 1000,
						},
					},
					{
						kind: 'video',
						mimeType: 'video/h264',
						clockRate: 90000,
						parameters: {
							'packetization-mode': 1,
							'profile-level-id': '42e01f',
							'level-asymmetry-allowed': 1,
							'x-google-start-bitrate': 1000,
						},
					},
				],
			},
		},
	};
	const sslOption = {
		key: fs.readFileSync(path.join(__dirname, config.ServerSetting.sslKey), 'utf-8'),
		cert: fs.readFileSync(path.join(__dirname, config.ServerSetting.sslCert), 'utf-8'),
	};
	const engineOptions = {
		httpsServerOption: {
			ssl: sslOption,
			ip: config.ServerSetting.listenIp,
			port: config.ServerSetting.listenPort,
			cryptoKey: config.ServerSetting.cryptoKey,
		},
		redisClientOption: {
			redisHost: config.ServerSetting.redisHost,
		},
	};

	let engine: ServerEngine;

	beforeAll(() => {
		console.log('Engine Create');
		engine = new ServerEngine(engineOptions);
	});

	test('Engine Run', () => {
		expect(engine.run()).toEqual(true);
	});
});
