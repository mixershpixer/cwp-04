// server.js
const net = require('net');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const port = 8124;

const DEFINE_ACK 	= 'ACK';
const DEFINE_DEC 	= 'DEC';
const DEFINE_QA  	= 'QA';
const DEFINE_FILES 	= 'FILES';
const DEFINE_REMOTE = 'REMOTE';
const DEFINE_COPY 	= 'COPY';
const DEFINE_NEXT	= 'NEXT';
const DEFINE_DECODE = 'DECODE';
const DEFINE_ENCODE = 'ENCODE';
const DEFINE_CLOSE	= 'close';
const DEFINE_CRYPTO_METHOD = 'rc4-hmac-md5';

let seed = 0;
let ARRQ = require('./qa.json');
let CLIENTS = [];
let connections = 0;
const log = fs.createWriteStream('client_id.txt');

const DEFAULT_DIR = process.env.DEFAULT_DIR;
const MAX_CONNECTIONS = parseInt(process.env.M_CONN);

const server = net.createServer((client) => {
	if (++connections >= MAX_CONNECTIONS + 1) { 
		console.log(`[${formatDate()}][WARNING]: For client no free slots!\n`);
		log.write(`[${formatDate()}][WARNING]: For client no free slots!\n`);
		connections--;
		client.destroy();
	} else {
		client.id = Date.now() + seed++;
		client.setEncoding('utf8');

		console.log(`[${formatDate()}]: Client #${client.id} connected\n`);
		log.write(`[${formatDate()}]: Client #${client.id} connected\n`);

		client.on('data', (data) => {
			if ((data === DEFINE_REMOTE) || (data === DEFINE_FILES) || (data === DEFINE_QA)) {
				if (data === DEFINE_FILES) fs.mkdir(DEFAULT_DIR + path.sep + client.id, () => {});
				CLIENTS[client.id] = data;
				client.write(DEFINE_ACK);
			}	
	        else if (client.id === undefined) {
	            client.write(DEFINE_DEC);
	            client.destroy();
	        }

	        if ((CLIENTS[client.id] === DEFINE_QA) && (data !== DEFINE_QA)) {     	
			    let answr = 'Bad answer';
			    if (Math.floor(Math.random() * 2) === 1) {
			    	let QID = -1;
		        	for (let i = 0; i < ARRQ.length; i++)
				        if (ARRQ[i].q === data) {
				        	QID = i;
				        	break;
				        }
			    	answr = ARRQ[QID].g;
			    }
	        	log.write(`[${formatDate()}][#${client.id}] > Data: ${data}; Answer: ${answr}\n`);
		        client.write(answr);	
		    } else if (CLIENTS[client.id] === DEFINE_FILES && data !== DEFINE_FILES) {
	            let x = data.split('₿');
				let buf = Buffer.from(x[0], 'hex');
				let filePath = DEFAULT_DIR + path.sep + client.id + path.sep + x[1];
				console.log(`CHECK: ${filePath}`);
				let fr = fs.createWriteStream(filePath);
				fr.write(buf);
				fr.close();
				client.write(DEFINE_NEXT);
	        } else if (CLIENTS[client.id] === DEFINE_REMOTE && data !== DEFINE_REMOTE) {
	            console.log(data);
	            let splt = data.split(' ');
	            let RS = fs.createReadStream(splt[1]);
	            let WS = fs.createWriteStream(splt[2]);
	            if (splt[0] === DEFINE_COPY) RS.pipe(WS).on(DEFINE_CLOSE, () => client.write(DEFINE_ACK));
	            else if (splt[0] === DEFINE_ENCODE) 
	            	RS.pipe(crypto.createCipher(DEFINE_CRYPTO_METHOD, splt[3])).pipe(WS).on(DEFINE_CLOSE, () => client.write(DEFINE_ACK));
	            else if (splt[0] === DEFINE_DECODE) 
	            	RS.pipe(crypto.createDecipher(DEFINE_CRYPTO_METHOD, splt[3])).pipe(WS).on(DEFINE_CLOSE, () => client.write(DEFINE_ACK));
	        }
		});

		client.on('end', () => {
			connections--;
			console.log(`[${formatDate()}]: Client #${client.id} disconnected\n`);
			log.write(`[${formatDate()}]: Client #${client.id} disconnected\n`);
		});
	}
});

server.listen(port, () => {
	console.log(`Server listening on localhost:${port}`);
});

function formatDate() { return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''); }