'use strict';

//set main entry point path
global.BOT_PATH = module.require('path').resolve(__dirname, '..');

function Bot() {
	var dispatcher = new(module.require('events').EventEmitter)();

	dispatcher.setMaxListeners(0); //remove listener limit
	dispatcher.on('newListener', function(event, listener) {
		var i, name;
		if(((i = event.indexOf('/')) + 1) && (name = event.substr(0, i))) {
			//todo check if module active
		}
	});

	//bind event commands
	this.on = this.addListener = dispatcher.on.bind(dispatcher);
	this.off = this.removeListener = dispatcher.removeListener.bind(dispatcher);
	this.once = dispatcher.once.bind(dispatcher);
	this.emit = dispatcher.emit.bind(dispatcher);

	var bot = this;

	this.loadConfig = function loadConfig(config, callback) {
		var error = false;
		if(typeof config === 'function' && typeof callback === 'undefined') {
			callback = config;
			config = undefined;
		}

		if(typeof config === 'string') {
			try {
				bot.config = module.require(BOT_PATH + '/' + config);
			} catch(e) {
				error = true;
				bot.config = {};
			}
		} else if(config instanceof Object) {
			bot.config = config;
		} else {
			try {
				bot.config = module.require(BOT_PATH + '/config.json');
			} catch(e) {
				error = true;
				bot.config = {};
			}
		}

		//make sure we have important values
		if(!error) {
			if(typeof bot.config.bot === 'undefined') {
				bot.config.bot = {
					'name': 'IRC-PONY',
					'modules': 'modules.json'
				};
			} else {
				if(typeof bot.config.bot.name === 'undefined') {
					bot.config.bot.name = 'IRC-PONY';
				}
				if(typeof bot.config.bot.modules === 'undefined') {
					bot.config.bot.modules = 'modules.json';
				}
			}
		}

		if(callback) callback(error, bot.config);
	};

	this.loadModules = function loadModules(modules, callback) {

		if(callback) callback();
	};

	this.run = function run(callback) {

		if(callback) callback();
		bot.emit('init');
	};
}

module.exports = Bot;