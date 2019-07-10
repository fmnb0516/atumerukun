const request = require('request');
const fileSystem = require("../lib/filesystem");

let future = Promise.resolve("ready");

const wget = (url) => {
	
	const options = {
			url: url,
			headers : {
				"accept" :  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
				"accept-encoding" : "gzip, deflate, br",
				"accept-language" : "ja,en-US;q=0.9,en;q=0.8",
				"user-agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36"
			},
			gzip: true,
			encoding: null
	};

	var p = future.then( () => {
		return new Promise((resolve, reject) => {
			request(options, (error, response, buffer) => {
				if(error) {
					reject(error);
					return;
				}
				
				if(response.statusCode !== 200) {
					reject("error status code : "+ response.statusCode);
					return;
				}
				
				resolve({
					status:response.statusCode,
					header:response.headers,
					buffer: buffer
				});
			});
		});
	});
	
	future = p;
	return p;
};

const download = (path, url) => {
	return wget(url).then(response => {
		return fileSystem.writeFile(path, response.buffer);
	});
};

module.exports.wget = wget;
module.exports.download = download;