/**
 * Rainbot main file
 */

'use strict';

var logger = require('./logger');

function Bot() {
	//events
	var dispatcher = new (require('events').EventEmitter)();
	dispatcher.setMaxListeners(0); //remove listener limit
	//add empty config
	var config = new (require('./config').Config)();
	//add MM
	var moduleManager = new (require('./moduleManager').ModuleManager)(dispatcher, config);

	//load module on new listener
	dispatcher.on('newListener', function (event) {
		var i, name;
		if (((i = event.indexOf('/')) + 1) && (name = event.substr(0, i))) {
			if (!moduleManager.exists(name)) {
				//better to not load modules automagically
				//moduleManager.load(name);
				logger.warn('Added new listener (' + event + ') for not loaded module!');
			}
		}
	});

	//bot config
	this.config = config;
	this._configFile = '';
	//bot MM
	this.modules = moduleManager;
	//dispatcher
	this.dispatcher = dispatcher;

	//list of core modules
	this._coreModules = ['irc', 'controls'];

	//protect the core modules from unload
	this._coreModules.forEach(function (m) {
		moduleManager.protect(m, true);
	});

	//set to true if running
	this.__running = false;
	//set to true if halting the bot
	this.__halting = false;

	//bind to exit event of main process
	var bot = this;
	process.on('exit', function onExit() {
		if (bot.__abort) {
			return; //do nothing on abort
		}
		if (!bot.__halting) {
			bot.__halting = true;
			bot.emit('halt', bot);
		}
		bot.unloadModules();
		if (bot.config.bot && bot.config.bot.autosave && bot._configFile) {
			bot.saveConfig(bot._configFile);
		}
	});

	//shutdown on ctrl+c gracefully
	process.on('SIGINT', this.end.bind(this));

	// This will override SIGTSTP and prevent the program from going to the background.
	process.on('SIGTSTP', function () {
		process.stdout.write('[PONY] SIGTSTP DERP! Not stopping for you!\n');
	});
}

Bot.prototype.addListener = function addListener() {
	this.dispatcher.addListener.apply(this.dispatcher, arguments);
	return this;
};

Bot.prototype.on = function on() {
	this.dispatcher.on.apply(this.dispatcher, arguments);
	return this;
};

Bot.prototype.off = function off() {
	this.removeListener.apply(this, arguments);
	return this;
};

Bot.prototype.removeListener = function removeListener() {
	this.dispatcher.removeListener.apply(this.dispatcher, arguments);
	return this;
};

Bot.prototype.once = function once() {
	this.dispatcher.once.apply(this.dispatcher, arguments);
	return this;
};

Bot.prototype.emit = function emit() {
	this.dispatcher.emit.apply(this.dispatcher, arguments);
	return this;
};

Bot.prototype._checkSaneBotDefaults = function () {
	//make sure we have important values
	if (typeof this.config.bot === 'undefined') {
		this.config.bot = {
			'name': 'Rainbot',
			'modules': 'modules.json',
			'debug': false,
			'autosave': true
		};
	} else {
		if (typeof this.config.bot.name !== 'string') {
			this.config.bot.name = 'Rainbot';
		}
		if (typeof this.config.bot.modules === 'undefined') {
			this.config.bot.modules = 'modules.json';
		}
		if (typeof this.config.bot.debug !== 'boolean') {
			this.config.bot.debug = false;
		}
		if (typeof this.config.bot.autosave !== 'boolean') {
			this.config.bot.autosave = true;
		}
	}

	//set logger debuging
	logger.debugging = this.config.bot.debug ? true : false;
};

Bot.prototype.loadConfig = function loadConfig(config, merge) {
	merge = merge ? true : false;
	var error = null;

	if (typeof config === 'string') {
		this._configFile = require('path').basename(config);
	} else if (config instanceof Object) {
		this._configFile = '';
	} else {
		this._configFile = 'config.json';
	}

	try {
		if (this._configFile) {
			var cpath = require('path').resolve(__dirname, '..', this._configFile);
			try {
				config = JSON.parse(require('fs').readFileSync(cpath).toString());
			} catch (e) {
				config = {};
			}
		}
		if (!merge) {
			this.config.clear(); //throw out old config
		}
		this.config.load(config); //load new config
		this._checkSaneBotDefaults(); //check for defaults
	} catch (e) {
		error = new Error('Cannot load config! ' + e);
	}

	if (error) {
		logger.error(error);
		logger.info('Failed to load config!');
	} else {
		logger.info('Config loaded' + (merge ? ' and merged to old config' : '') + '!');
	}

	if (!error) {
		try {
			this.modules.reloadConfig(this.config); //apply new config to modules
		} catch (e) {
			logger.error(new Error('Failed to (re)apply config to modules: ' + e));
		}
	}

	this.dispatcher.emit('config-load', error, this);

	return this;
};

Bot.prototype.saveConfig = function saveConfig(savefile, asString) {
	if (asString) {
		return JSON.stringify(this.config, null, 4);
	}

	//get only basename
	savefile = require('path').basename(savefile);

	var error = null;

	//blocking write
	try {
		var cpath = require('path').resolve(__dirname, '..', savefile);
		require('fs').writeFileSync(cpath, JSON.stringify(this.config, null, 4));
		logger.info('Config saved to \'' + savefile + '\'.');
	} catch (err) {
		error = new Error('Failed to save config with error: ' + err);
		logger.error(error);
	}

	this.dispatcher.emit('config-save', error, this);

	return this;
};

Bot.prototype.loadModules = function loadModules(modules) {
	var error = null;
	if (this.__running) {
		error = new Error('Bot is already running, please load the modules before issuing \'run\'!');
		logger.error(error);
		this.abort(error);
		return this;
	}

	if (typeof this.config.bot === 'undefined') { //we need atleast empty bot config
		this.config.bot = {
			'modules': 'modules.json'
		};
	}

	if (typeof modules === 'string') {
		this.config.bot.modules = modules;
		modules = {};
	} else if (typeof modules !== 'object' && typeof this.config.bot.modules === 'object') {
		modules = this.config.bot.modules;
	} else if (typeof modules !== 'object' && typeof this.config.bot.modules === 'string') {
		modules = {};
	} else if (typeof modules !== 'object') {
		modules = {};
		error = new Error('Modules was nor Object nor Array nor String! Trying to load default \'modules.json\'.');
	}

	if (modules instanceof Array) {
		var tmp = modules.slice(0);
		modules = {};
		tmp.forEach(function (v) {
			modules[v] = true;
		});
	}

	if (error) { //abort
		logger.error(error);
		this.abort(error);
		return this;
	}

	//load the file
	if (Object.keys(modules).length <= 0) {
		try {
			var mpath = require.resolve('./../' + this.config.bot.modules);
			require.cache[mpath] = null; //empty require cache for this file
			modules = require(mpath);
		} catch (e) {
			modules = {};
			error = new Error('Cannot load modules file \'' + this.config.bot.modules + '\'!');
		}
	}

	//start the load of core modules
	try {
		this._coreModules.forEach(function (name) {
			this.modules.load(name);
		}, this);
	} catch (e) {
		error = e;
	}

	if (error) { //imediate abort on failure
		logger.error(error);
		this.abort(error);
		return this;
	}

	//start the load of other modules
	var keys = Object.keys(modules);
	if (keys.length > 0) {
		keys.forEach(function (name) {
			if (modules[name] === true) {
				try {
					this.modules.load(name);
				} catch (e) {
					logger.error(e);
					error = new Error('Failed loading some modules!');
				}
			}
		}, this);
	}

	logger.info('Modules loaded!');

	if (error) {
		logger.warn(error);
	}
	return this;
};

Bot.prototype.unloadModules = function unloadModules() {
	//unprotect core modules
	this._coreModules.forEach(function (name) {
		this.modules.protect(name, false);
	}, this);

	//unload all modules
	this.modules.getModules().reverse().forEach(function (m) {
		try {
			this.modules.unload(m);
		} catch (e) {
			//ignore all errors
			//just note them
			logger.warn('Caught error on module \'' + m + '\' unload: ' + e);
		}
	}, this);

	logger.info('Modules unloaded!');
	return this;
};

Bot.prototype.load = function load(names) {
	if (!(names instanceof Array)) {
		names = [names];
	}

	names.forEach(function (name) {
		this.modules.load(name);
	}, this);

	return this;
};

Bot.prototype.unload = function unload(names) {
	if (!(names instanceof Array)) {
		names = [names];
	}

	names.forEach(function (name) {
		this.modules.unload(name);
	}, this);

	return this;
};

Bot.prototype.reload = function reload(names) {
	if (!(names instanceof Array)) {
		names = [names];
	}

	names.forEach(function (name) {
		this.modules.reload(name);
	}, this);

	return this;
};

Bot.prototype.run = Bot.prototype.start = function run() {
	if (this.__running) {
		return this;
	}

	logger.info('Bot initialization starting...');
	this.emit('init', this);

	this.__running = true;

	return this;
};

Bot.prototype.end = Bot.prototype.stop = function end() {
	if (!this.__halting) {
		this.__halting = true;
		this.emit('halt', this);
		logger.info('Exiting ...');
		setTimeout(process.exit, 1000); //delay it for a sec
	}

	return this;
};

Bot.prototype.abort = function abort() {
	this.__abort = true;
	process.exit(1);
	return this;
};

module.exports.Bot = Bot;
module.exports.create = function createBot() {
	return new Bot();
};
