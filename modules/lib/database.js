const sqlite3 = require('sqlite3');
const mysql      = require('mysql');

class MySQLDatabse {
	constructor(configure) {
		this.connection = mysql.createConnection({
			host     : configure.host,
			user     : configure.user,
			password : configure.password,
			database: configure.dbname,
			port: configure.port,
		});
		this.connection.connect();
	};
	
	selectQuery(sql, parameter) {
		return new Promise((resolve, reject) => {
			this.connection.query(sql, parameter, (err, rows) => {
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
			this.connection.query(sql, parameter, (err) => {
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
			this.connection.query(sql, parameter, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result.insertId);
				}
			});
		});
	};
	
	updateQuery(sql, parameter) {
		return new Promise((resolve, reject) => {
			this.connection.query(sql, parameter, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve({});
				}
			});
		});
	};
	
	run(query) {
		this.connection.query(query);
	};
	
	serialize(handler) {
		handler(this);
		return this;
	};
	
	on(type, handler) {
		this.connection.on(type,handler);
		return this;
	};
}

class SQLite3Databse {
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
		this.db.run(query);
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
	if(type === "sqlite3") {
		return new SQLite3Databse(configure);
	} else if(type === "mysql") {
		return new MySQLDatabse(configure);
	}
};