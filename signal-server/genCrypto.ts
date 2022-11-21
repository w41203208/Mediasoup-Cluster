import { CryptoCore } from './src/util/CryptoCore';

const fs = require('fs');

const cc = new CryptoCore('0af135ee758b325ff73bffe60d59efe2');

const encoding = 'utf8';
const mode = '0666';
const flag = 'w+';

let result = '';
for (let i = 0; i < 500; i++) {
	const text = cc.cipherIv('test') + '\n';
	result += text;
}

fs.writeFile('name.txt', result, { encoding, mode, flag }, (err: any) => {
	if (err) {
		console.log(err);
	}
});
