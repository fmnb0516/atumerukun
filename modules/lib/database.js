const sqlite3 = require('sqlite3');

class SQLite3Databse extends Databse {
	constructor(configure) {
		const file = configure.dbfile;
		this.db = new sqlite3.Database(file);
	};
	
	selectQuery(sql, parameter) {
		return new Promise((resolve, reject) => {
			this.db.all(sql, parameter, (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	};
	
	deleteQuery(sql, parameter) {
		return new Promise((resolve, reject) => {
			this.db.all(sql, parameter, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve({});
				}
			});
		});
		
	};
	
	insertQuery(sql, parameter) {
		return new Promise((resolve, reject) => {
			this.db.run(sql, parameter, function(err){
				if (err) {
					reject(err);
				} else {
					resolve(this.lastID);
				}
			});
		});
	};
	
	updateQuery(sql, parameter) {
		return new Promise((resolve, reject) => {
			this.db.run(sql, parameter, function(err){
				if (err) {
					reject(err);
				} else {
					resolve({});
				}
			});
		});
	};
	
	run(query) {
		db.run(query);
	};
	
	serialize(handler) {
		this.db.serialize(() => {
			handler(this);
		});
		return this;
	};
	
	on(type, handler) {
		this.db.on(type,handler);
		return this;
	};
}

module.exports.createDatabase = (type, configure) => {
	
};