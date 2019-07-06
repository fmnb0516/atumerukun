
const LOG_LEVEL_DEBUG = 0;
const LOG_LEVEL_INFO = 1;
const LOG_LEVEL_WARN = 2;
const LOG_LEVEL_ERROR = 3;

const writeLog = (output, category, level, text) => {
	output("[" +  level + "]" + " " + category + " " + text);
};

class Logger {
	
	constructor(category, loglevel, output) {
		this.category = category;
		this.loglevel = loglevel;
		this.output = output;
	};
	
	getCategory() {
		return this.category;
	};
	
	debug(text) {
		if(this.isDebug()) {
			writeLog(this.output, this.category, "DEBUG", text);
		}
	};
	
	info(text) {
		if(this.isInfo()) {
			writeLog(this.output, this.category, "INFO", text);
		}
	};
	
	warn(text) {
		if(this.isWarn()) {
			writeLog(this.output, this.category, "WARN", text);
		}
		
	};
	
	error(text) {
		if(this.isError()) {
			writeLog(this.output, this.category, "ERROR", text);
		}
	};
	
	isDebug() {
		return this.loglevel >= LOG_LEVEL_DEBUG;
	};
	
	isInfo() {
		return this.loglevel >= LOG_LEVEL_INFO;
	};
	
	isWarn() {
		return this.loglevel >= LOG_LEVEL_WARN;
	};
	
	isError() {
		return this.loglevel >= LOG_LEVEL_ERROR;
	};
};

module.exports.LOG_LEVEL_INFO = LOG_LEVEL_INFO;
module.exports.LOG_LEVEL_WARN = LOG_LEVEL_WARN;
module.exports.LOG_LEVEL_ERROR = LOG_LEVEL_ERROR;

module.exports.instance = (category, level) => {
	const loglevel = level !== undefined ? level : LOG_LEVEL_INFO;
	
	return new Logger(category, loglevel, (text) => {
		console.log(text);
	});
};