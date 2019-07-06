const scheduler = require("./scheduler");
const cronParser = require('./cron');
const logger = require("./logger").instance("APPLICATION");
const sqlite3 = require('sqlite3');

class HandlerManager {
	constructor(baseDir) {
		this.baseDir = baseDir;
		this.invokers = {};
	};

	install(name, invoker) {
		this.invokers[name] = invoker;
	};

	getInvokers() {
		return this.invokers;
	};
}

class WebInstaller {
	constructor(webapp,express, baseDir) {
		this.webapp = webapp;
		this.express = express;
		this.baseDir = baseDir;
	};

	resource(path, dir) {
		console.log(this.baseDir +"/"+ dir);
		this.webapp.use(path, this.express.static(this.baseDir +"/"+ dir));
	};

	get(path, callback) {
		this.webapp.get(path, callback);
		return this;
	};

	put(path, callback) {
		this.webapp.put(path, callback);
		return this;
	};

	post(path, callback) {
		this.webapp.post(path, callback);
		return this;
	};

	delete(path, callback) {
		this.webapp.delete(path, callback);
		return this;
	};
};

class SimpleTask extends scheduler.Task {
	constructor(id, name, url, cron, context, invokers) {
		super(name, context);
		this.cron = cron;
		this.id = id;
		this.context = context;
		this.invokers = invokers;
		this.url = url;
	};
	
	is(now) {
		//return this.cron.match(now);
		return true;
	};
	
	async invoke() {
		logger.info("start task :" + this.id);
		const scraping = await this.context.repo.getWebscraping(this.id);
		const handlers = scraping.pageHandlers;
		if(handlers.length === 0) {
			return;
		}

		const plugins = handlers.map(h => {
			return {
				handler : this.invokers[h.handler_type],
				configure : h.configure
			}
		});

		const persistence = new DatabasePersistenceContainer(this.id, this.context.repo);
		const chain = new HandlerChain(plugins, 0, {
			baseDir : this.context.baseDir,
			persistence : persistence
		}, null);

		await chain.proceed({}, this.url);
		await persistence.commitResult();

		logger.info("finish task :" + this.id);
	};
};

class PageResult {
	constructor(data, parent) {
		this.data = data;
		this.parent = parent;
	};
	
	subset(data) {
		return new PageResult(data, this);
	};
};

class HandlerChain {
	constructor(plugins, index, context, result, url) {
		this.plugins = plugins;
		this.index = index;
		this.context = context;
		this.result = result;
		this.url = url;
	};
	
	async proceed(result, url) {
		const plugin = this.plugins[this.index];
		if(plugin === undefined || plugin === null) {
			return;
		}
		
		const newUrl = url === undefined || url === null ? this.url : url;
		
		const ret = this.result === undefined || this.result === null
			? new PageResult(result, null) : this.result.subset(result);
		
		const chain = new HandlerChain(this.plugins, this.index+1, this.context, ret, newUrl);

		await plugin.handler(plugin.configure, chain);
	};

	getContext() {
		return this.context;
	}
	
	lastPageResult() {
		return this.result === undefined || this.result === null
			? null : this.result.data;
	};
	
	getUrl() {
		return this.url
	};
};

class SimpleTaskResolver extends scheduler.TaskResolver {
	constructor(context, invokers) {
		super();
		this.context = context;
		this.invokers = invokers;
	};
	
	async getTasks() {
		const entries = await this.context.repo.allWebscraping();
        return entries.filter(item => item.status === 0).map(item => {
			const cron = cronParser(item.schedule);
			return new SimpleTask(item.id, item.name, item.target_url, cron, this.context, this.invokers);
		});
	};
};

class Repository {
	constructor(db) {
		this.db = db;
	};
	
	createWebscraping(json) {
		return new Promise((resolve, reject) => {
			const parameter1 = [json.name, json.schedule, json.target_url, json.description, json.status];
			
			this.db.run("insert into web_scraping (name, schedule, target_url, description, status) values (?, ?, ?, ?, ?)", parameter1, function(err){
				if (err) {
					reject(err);
				} else {
					resolve(this.lastID);
				}
			});
		}).then(id => {
			var sortNo = 0;
			
			const promisses = json.pageHandlers.map(h => {
				return new Promise((resolve, reject) => {
					const sort = ++sortNo;
					const parameter2 = [id, h.handler_type, h.name, h.description, JSON.stringify(h.configure), sort];
					
					this.db.run("insert into page_handler (web_scraping_id, handler_type, name, description, configure, sort) values (?,?,?,?,?,?)", parameter2, function(err){
						if (err) {
							reject(err);
						} else {
							resolve(this.lastID);
						}
					});
				});
			})
			
			return Promise.all(promisses).then(values => id);
		});
		
	};
	
	removeWebscraping(id) {
		const p1 = new Promise((resolve, reject) => {
			this.db.all( "DELETE FROM web_scraping WHERE id = ?", [id], (err) => {
				if (err) {
					reject(err);
				} else {
					resolve(id);
				}
			});
		});
		const p2 = new Promise((resolve, reject) => {
			this.db.all( "DELETE  FROM page_handler WHERE web_scraping_id = ?", [id], (err) => {
				if (err) {
					reject(err);
				} else {
					resolve(id);
				}
			});
		});
		
		return Promise.all([p1, p2]).then(values => {
			return true;
		});
	};
	
	updateWebscraping(id, json) {
		return new Promise((resolve, reject) => {
			const parameter1 = [json.name, json.schedule, json.target_url, json.description, json.status, id];
			
			this.db.run("update web_scraping SET name=?, schedule=?, target_url=?, description=?, status=? WHERE id = ?", parameter1, function(err){
				if (err) {
					reject(err);
				} else {
					resolve(id);
				}
			});
		}).then(id => {
			return new Promise((resolve, reject) => {
				this.db.all( "DELETE  FROM page_handler WHERE web_scraping_id = ?", [id], (err) => {
					if (err) {
						reject(err);
					} else {
						resolve(id);
					}
				});
			});
		}).then(id => {
			var sortNo = 0;
			const promisses = json.pageHandlers.map(h => {
				return new Promise((resolve, reject) => {
					const sort = ++sortNo;
					const parameter2 = [id, h.handler_type, h.name, h.description, JSON.stringify(h.configure), sort];
					
					this.db.run("insert into page_handler (web_scraping_id, handler_type, name, description, configure, sort) values (?,?,?,?,?,?)", parameter2, function(err){
						if (err) {
							reject(err);
						} else {
							resolve(this.lastID);
						}
					});
				});
			})
			
			return Promise.all(promisses).then(values => id);
		});
			
	};
	
	getWebscraping(id) {
		const p1 = new Promise((resolve, reject) => {
			this.db.all( "SELECT id, name, schedule, target_url, description, status FROM web_scraping WHERE id = ?", [id], (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
		
		const p2 = new Promise((resolve, reject) => {
			this.db.all( "SELECT id, web_scraping_id, handler_type, name, description, configure, sort FROM page_handler WHERE web_scraping_id = ? ORDER BY sort ASC", [id], (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
		
		return Promise.all([p1, p2]).then(values => {
			const webScraping = values[0];
			const pageHandlers = values[1];
			
			pageHandlers.forEach(h => {
				h.configure = JSON.parse(h.configure);
			});
			
			if(webScraping.length !== 1) {
				return null;
			}
			
			const result = webScraping[0];
			result.pageHandlers = pageHandlers;
			
			return result;
		});
	};
	
	allWebscraping(offset, limit) {
		const baseSql = "SELECT id, name, schedule, target_url, description, status FROM web_scraping";
		const limitSql = limit !== undefined ? " LIMIT " + limit : "";
		const offsetSql = offset !== undefined ? " OFFSET " + offset : "";
		const sql = baseSql + limitSql + offsetSql;
		
		return new Promise((resolve, reject) => {
			this.db.all(sql, (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	};
	
	findPageResults(urls) {
		const inquery = "(" + urls.map(u => "'" + u + "'").join(",") + ")";
		return new Promise((resolve, reject) => {
			this.db.all( "SELECT id, web_scraping_id, url, create_at FROM page_result WHERE url IN " + inquery, [], (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	};

	getPageResult(id) {
		const p1 = new Promise((resolve, reject) => {
			this.db.all( "SELECT id, web_scraping_id, url, create_at FROM page_result WHERE id = ?", [id], (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
		
		const p2 = new Promise((resolve, reject) => {
			this.db.all( "SELECT id, page_result_id, data_key, data_value, data_type, sort FROM page_value WHERE page_result_id = ? ORDER BY sort ASC", [id], (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
		
		return Promise.all([p1, p2]).then(values => {
			const pageResults = values[0];
			const pageValues = values[1];
			
			if(pageResults.length !== 1) {
				return null;
			}
			
			const result = pageValues[0];
			const map = {};
			
			pageValues.forEach(v => {
				if(map[v.data_key] === undefined) {
					map[v.data_key] = [];
				}
				
				map[v.data_key].push({
					data_key : v.data_key,
					data_value : v.data_value,
					data_type : v.data_type,
					sort : v.sort
				});
			});
			
			result.page_values = map
			return result;
		});
	};
	
	createPageResult(json) {
		const parameter1 = [json.web_scraping_id, json.url, json.create_at];
		const page_values = json.page_values;
		
		return new Promise((resolve, reject) => {	
			this.db.run("insert into page_result (web_scraping_id, url, create_at) values (?, ?, ?)", parameter1, function(err){
				if (err) {
					reject(err);
				} else {
					resolve(this.lastID);
				}
			});
		}).then(id => {
			const promisses = page_values.map(h => {
				return new Promise((resolve, reject) => {
					const parameter2 = [id, h.data_key, h.data_value, h.data_type, h.sort];
					
					this.db.run("insert into page_value (page_result_id, data_key, data_value, data_type, sort) values (?,?,?,?,?)", parameter2, function(err){
						if (err) {
							reject(err);
						} else {
							resolve(this.lastID);
						}
					});
				});
			})
			
			return Promise.all(promisses).then(values => id);
		});
	};
	
	allPageResult(web_scraping_id, offset, limit) {
		const baseSql = "SELECT web_scraping.id as web_scraping_id, name, page_result.id as id , web_scraping_id, url, create_at FROM page_result INNER JOIN web_scraping ON page_result.web_scraping_id = web_scraping.id";
		
		const where = web_scraping_id !== undefined ? " WHERE web_scraping_id = ? " : "";
		const parameter = web_scraping_id !== undefined ? [web_scraping_id] : [];
		
		const limitSql = limit !== undefined ? " LIMIT " + limit : "";
		const offsetSql = offset !== undefined ? " OFFSET " + offset : "";
		const sql = baseSql + where + limitSql + offsetSql;
		
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
	
	removePageResult(id) {
		const p1 = new Promise((resolve, reject) => {
			this.db.all( "DELETE FROM page_result WHERE id = ?", [id], (err) => {
				if (err) {
					reject(err);
				} else {
					resolve(id);
				}
			});
		});
		const p2 = new Promise((resolve, reject) => {
			this.db.all( "DELETE  FROM page_value WHERE page_result_id = ?", [id], (err) => {
				if (err) {
					reject(err);
				} else {
					resolve(id);
				}
			});
		});
		
		return Promise.all([p1, p2]).then(values => {
			return true;
		});
	};
};

class PersistenceContainer {
	constructor(id) {
		this.id = id;
	};
	
	getId() {
		return this.id;
	};
	
	async commitResult() {
	};

	async existsPageResult(urls) {
	}
	
	addPageResult(url, data) {
	};
};

class DatabasePersistenceContainer extends PersistenceContainer {
	constructor(id, repo) {
		super(id);
		this.repo = repo;
		
		this.durty = [];
	};

	async existsPageResult(urls) {
		return this.repo.findPageResults(urls)
			.then( data => {
				const map = {};

				urls.forEach(u => map[u] = false);
				data.forEach(d => map[d.url] = true);

				return map;
			});
	}
	
	addPageResult(url, data, typeHint) {
		const page_values = [];
		var sort = 0;

		var typeHintMap = {};
		typeHint.forEach((e) => {
			typeHintMap[e.hintkey] = typeHintMap.hintvalue;
		})
		
		Object.keys(data).forEach(key => {
			data[key].forEach(val => {
				page_values.push({
					data_key : key,
					data_value : val,
					data_type : typeHintMap[key] !== undefined ? typeHintMap[key] : 0,
					sort : ++sort
				});
			});
		});
		
		this.durty.push({
			web_scraping_id : this.getId(),
			url : url,
			create_at : new Date(),
			page_values : page_values
		});
	};
	
	async commitResult() {
		const promisses = this.durty.map(item => {
			return this.repo.createPageResult(item);
		});
		
		return Promise.all(promisses);
	};
};

module.exports.HandlerManager = HandlerManager;

module.exports.WebInstaller = WebInstaller;

module.exports.createRepository = (baseDir, configure) => {
	const file = baseDir + "/db/sqlite3.db";
	
	const db = new sqlite3.Database(file);
	
	db.on("trace", function(sql) {
		logger.info(sql);
	});
	
	db.serialize(() => {
		db.run('CREATE TABLE IF NOT EXISTS web_scraping (id integer primary key autoincrement, name text unique not null, schedule text not null, target_url text not null, description text, status integer not null default 0)');
		db.run('CREATE TABLE IF NOT EXISTS page_handler (id integer primary key autoincrement, web_scraping_id integer not null, name text not null, handler_type text not null, description text, configure json, sort integer not null)');
		db.run('CREATE TABLE IF NOT EXISTS page_result (id integer primary key autoincrement, web_scraping_id integer not null, url text unique not null, create_at datetime not null)');
		db.run('CREATE TABLE IF NOT EXISTS page_value (id integer primary key autoincrement, page_result_id integer not null, data_key text not null, data_value text, data_type integer not null, sort integer not null)');
	});
	
	return new Repository(db);
};

module.exports.TaskResolver = SimpleTaskResolver;