require('dotenv').config();

export const config = {
	ServerSetting: {
		listenIp: process.env.DOMAIN!,
		listenPort: Number(process.env.PORT),
		sslCert: './ssl/cert.pem',
		sslKey: './ssl/key.pem',
		cryptoKey: process.env.CRYPTO_KEY!,
		redisHost: process.env.REDIS_HOST!,
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

// const keygenerateurl = 'http://n.sfs.tw/content/index/11830';
