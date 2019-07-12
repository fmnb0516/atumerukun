
const util = require('util');
const fs = require('fs-extra');

module.exports = {
		readdir : util.promisify(fs.readdir),
		stat : util.promisify(fs.stat),
		readFile : util.promisify(fs.readFile),
		writeFile: util.promisify(fs.writeFile),
		remove : util.promisify(fs.remove),
		mkdirs : util.promisify(fs.mkdirs),
		copy : util.promisify(fs.copy),
		access: util.promisify(fs.access),
		rename: util.promisify(fs.rename),
		
		exist : async (path) => {
			return util.promisify(fs.stat)(path)
				.then( (stats, error) => error ? false : true)
				.catch((e) => false)
		}
};