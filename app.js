/**
 * zero start file
 */

'use strict';

//set main entry point path
global.BOT_DIR = require('path').resolve(__dirname, '.');
global.LIBS_DIR = require('path').resolve(BOT_DIR, 'libs');
global.MODULES_DIR = require('path').resolve(BOT_DIR, 'modules');

//create bot
var botDomain = require('domain').create();
var logger = require(LIBS_DIR + '/logger');

botDomain.on('error', function (e) {
	logger.error(e);
});

botDomain.run(function () {
	var bot = new (require(LIBS_DIR + '/bot').Bot)();
	// OR var bot = require('./libs/bot').create();
	bot.loadConfig(); //load the config from file - default is config.json
	bot.loadModules(); //preload all active modules - default is from config or modules.json
	bot.run(); //and run the bot
});
