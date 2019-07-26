#!/usr/bin/env node

process.env.TZ = "Asia/Tokyo";

const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const logger = require("./modules/lib/logger").instance("SYSTEM");
const fileSystem = require("./modules/lib/filesystem");
const scheduler = require("./modules/lib/scheduler");
const httpclient = require("./modules/lib/http-client");
const application = require("./modules/lib/application");

const baseDir = process.argv.length >= 3 ? process.argv[2] : process.cwd();
const moduleDir = baseDir;

logger.info("application loading now");
logger.info("    -baseDir : " + baseDir);
logger.info("    -moduleDir :" + moduleDir);

const externalFunc = (name) => {
	return require(name);
};

const run = async () => {
	const configure = await fileSystem.readFile(baseDir + "/configure.json", 'utf8')
		.then(text => JSON.parse(text));
	
	const handlerManager = new application.HandlerManager(moduleDir +"/modules/plugins/"+ p);

	const webApp = express();
	webApp.use(bodyParser.urlencoded({extended: true}));
	webApp.use(bodyParser.json());

	const uploader = multer({dest: baseDir + '/storage/' + configure.webserver.upload}); 

	webApp.use('/storage', express.static(baseDir + '/storage'));

	const pluginPaths = await fileSystem.readdir(moduleDir+"/modules/plugins");
	const plugins = [];

	const context = {
		baseDir : baseDir,
		repo : application.createRepository(baseDir, configure.database),
		httpclient : httpclient,
		fileSystem : fileSystem,
		plugins : plugins,
		external : externalFunc,
		configure : configure
	};

	for(var i=0; i<pluginPaths.length; i++) {
		const pluginData = {};
		var p = pluginPaths[i];

		pluginData.name = p;
		pluginData.dir = moduleDir +"/modules/plugins/"+ p;
		pluginData.web = false;
		pluginData.handler = false;

		const webInstaller = new application.WebInstaller(webApp, express, uploader, moduleDir +"/modules/plugins/"+ p);
		if(await fileSystem.exist(moduleDir +"/modules/plugins/"+ p + "/web.js") === true) {
			require(moduleDir +"/modules/plugins/"+ p + "/web.js")(webInstaller, context,
				require("./modules/lib/logger").instance(p));
			pluginData.web = true;
		}

		if(await fileSystem.exist(moduleDir +"/modules/plugins/"+ p + "/handler.js") === true) {
			require(moduleDir +"/modules/plugins/"+ p + "/handler.js")(handlerManager, context,
				require("./modules/lib/logger").instance(p));
			pluginData.handler = true;
		}

		plugins.push(pluginData);
	}

	webApp.listen(configure.webserver.port, () => logger.info('Web App Server Listening on port 3000'));
	
	logger.info("application start");
	
	const pooling = scheduler.instance(new application.TaskResolver(context, handlerManager.getInvokers()));

	webApp.get('/system/shutdown', (req, res) => {
		pooling.stop();
		res.send("ok");
	});

	logger.info("    application stop -> request to http://localhost:3000/system/shutdown");

	await pooling.start();

};

run()
	.then(() => logger.info("application end"))
	.then(() => process.exit());
