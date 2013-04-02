/* jslint node: true */
'use strict';

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
});