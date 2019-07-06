const logger = require("./logger").instance("SCHEDULE");

class TaskResolver {
	async getTasks() {
		return [];
	};
};

class Task {
	constructor(name) {
		this.name = name;
	};
	
	is(now) {
		return false;
	};
	
	async invoke() {
	};
	
	name() {
		return this.name;
	};
	
};

const pool = async (context) => {
	const now = new Date();
	logger.info("pooling start, [" + now + "]");
	
	if(context.scheduler.status === "stopping") {
		logger.info("scheduler is stop operation handled.");
		
		context.scheduler.status = "stopped";
		context.resolve(context.scheduler);
		return;
	}
	
	const taskResolver = context.scheduler.resolver;
	const tasks = await taskResolver.getTasks();
	
	for (var i = 0; i < tasks.length; i++) {
		var t = tasks[i];	
		
		logger.info("handle task. name : " + t.name + ", id:");
		
		if(t.is(now) === false) {
			logger.info("skip task, unmatch schedule. name : " + t.name);
		} else {
			logger.info("kick task, name : " + t.name);
			t.invoke();
		}
		
	}
	
	setTimeout(pool, 1000 * 60, context);
	logger.info("pooling end");
};

class Scheduler {
	constructor(resolver) {
		this.status = "stopped";
		this.resolver = resolver;
	};
	
	start() {
		if(this.status !== "stopped") {
			logger.warn("start faild, status is : " + this.status);
			return;
		}
		
		this.status = "starting";
		
		return new Promise((resolve, reject) => {
			this.status = "started";
			const milliseconds = new Date().getMilliseconds();
			const seconds = 60 - new Date().getSeconds();
			
			const delay = (seconds * 1000) - milliseconds;
			logger.info("started scheduler. first pool is " +delay+ "[msec] delay."); 
			setTimeout(pool, delay, {
				resolve : resolve,
				reject : reject,
				scheduler : this
			});
		});
	};
	
	stop() {
		if(this.status === "stopped" || this.status === "stopping") {
			logger.warn("stop faild, status is : " + this.status);
			return;
		}
		
		logger.info("scheduler is stopping now");
		this.status = "stopping";
	}
};

module.exports.instance = (resolver) => {
	return new Scheduler(resolver);
};

module.exports.TaskResolver = TaskResolver;
module.exports.Task = Task;