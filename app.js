/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

//set main entry point path
global.BOT_DIR = require('path').resolve(__dirname, '.');
global.LIBS_DIR = require('path').resolve(BOT_DIR, 'libs');
global.MODULES_DIR = require('path').resolve(BOT_DIR, 'modules');

//create bot

var botDomain = require('domain').create();
var logger = require('./libs/logger');

botDomain.on('error', function(e) {
	logger.error(e);
});

botDomain.run(function() {
	var bot = new(require('./libs/bot').Bot)();
	// OR var bot = require('./libs/bot').create();
	bot.loadConfig(); //load the config from file - default is config.json
	bot.loadModules(); //preload all active modules - default is from config or modules.json
	bot.run(); //and run the bot

	//export the bot
	module.exports = bot;
});