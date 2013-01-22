//set main entry point path
global.BOT_PATH = require('path').resolve(__dirname, '..');

module.exports = function Bot() {
	'use strict';

	var dispatcher = new(require('events').EventEmitter)();

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

	//loaded modules
	this.modules = [];
	//bot config
	this.config = {
		'bot': {}
	};

	var bot = this;

	this.loadConfig = function loadConfig(config, callback) {
		var error = false;
		if(typeof config === 'function' && typeof callback === 'undefined') {
			callback = config;
			config = undefined;
		}

		if(typeof config === 'string') {
			try {
				bot.config = require(BOT_PATH + '/' + config);
			} catch(e) {
				error = true;
				bot.config = {};
			}
		} else if(config instanceof Object) {
			bot.config = config;
		} else {
			try {
				bot.config = require(BOT_PATH + '/config.json');
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
		if(typeof modules === 'function' && typeof callback === 'undefined') {
			callback = modules;
			modules = {};
		}
		var error = false;
		if(typeof modules === 'string') {
			bot.config.bot.modules = modules;
			modules = {};
		} else if(typeof modules === 'object' && modules instanceof Array) {
			var tmp = modules.slice(0);
			modules = {};
			for(var i = 0; i < tmp.length; i++) {
				modules[tmp[i]] = true;
			}

		} else if(typeof modules !== 'object') {
			bot.error('Modules was nor Object nor Array nor String!');
			modules = {};
			error = true;
		}

		//first load core modules
		var core_modules = {
			'irc': true
		};
		Object.keys(core_modules).forEach(function(name) {
			if(core_modules[name] === true) {
				bot.load(name);
			}
		});

		//then custom modules
		if(Object.keys(modules).length <= 0) {
			try {
				modules = require(BOT_PATH + '/' + bot.config.bot.modules)
			} catch(e) {
				modules = {};
				bot.error('Cannot load modules file \'' + bot.config.bot.modules + '\'!');
				error = true;
			}
		}

		var keys = Object.keys(modules);
		if(keys.length > 0) {
			keys.forEach(function(name) {
				if(modules[name] === true) {
					bot.load(name);
				}
			});
		}

		if(callback) callback(error, bot.modules);
	};

	this.load = function load(name, callback) {
		var error = true;
		var module;
		if(!bot.modules.some(function(module) {
			return module.name === name;
		})) {
			try {
				module = new(require('./module'))(name, dispatcher);
				error = false;
			} catch(e) {
				bot.error('Cannot load ' + name + ' module!' + e);
			}

			if(!error) {
				bot.modules.push(module);
				if(typeof module.init === 'function') module.init();
			}
		}

		if(callback) callback(error, module);
	};

	this.unload = function unload(name, callback) {
		var error = !bot.modules.some(function(module, i) {
			if(module.name === name) {
				if(typeof module.halt === 'function') module.halt();
				bot.modules.splice(i, 1);

				return true;
			}

			return false;
		});

		if(callback) callback(error);
	};

	this.error = this.info = this.log = this.warn = function log() {
		console.log.apply(this, arguments);
	};

	this.run = function run(callback) {

		if(callback) callback();
		bot.emit('init');
	};
};