/**
 * Rainbot main file
 */

/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

//check main entry point path
if (!global.BOT_DIR) global.BOT_DIR = require('path').resolve(__dirname, '..');
if (!global.LIBS_DIR) global.LIBS_DIR = require('path').resolve(BOT_DIR, 'libs');
if (!global.MODULES_DIR) global.MODULES_DIR = require('path').resolve(BOT_DIR, 'modules');

var logger = require(LIBS_DIR + '/logger');
var helpers = require(LIBS_DIR + '/helpers');

function Bot() {
	//events
	var dispatcher = new(require('events').EventEmitter)();
	dispatcher.setMaxListeners(0); //remove listener limit
	//add empty config
	var config = new(require(LIBS_DIR + '/config').Config)();
	//add MM
	var moduleManager = new(require(LIBS_DIR + '/moduleManager').ModuleManager)(dispatcher, config);

	//load module on new listener
	dispatcher.on('newListener', function(event, listener) {
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
	this._configWatch = null;
	this._configFile = '';
	//bot MM
	this.modules = moduleManager;
	//dispatcher
	this.dispatcher = dispatcher;

	//list of core modules
	this._core_modules = ['irc', 'controls'];

	//protect the core modules from unload
	this._core_modules.forEach(function(m) {
		moduleManager.protect(m, true);
	});

	//set to true if halting the bot
	this.halting = false;

	//bind to exit event of main process
	var bot = this;
	process.on('exit', function() {
		if (!bot.halting) {
			bot.halting = true;
			bot.emit('halt', bot);
		}
		bot.unloadModules();
		if (bot.config.bot && bot.config.bot.autosave && bot._configFile) bot.saveConfig(bot._configFile);
	});

	//shutdown on ctrl+c gracefully
	process.on('SIGINT', this.end.bind(this));

	// This will override SIGTSTP and prevent the program from going to the background.
	process.on('SIGTSTP', function() {});
}

Bot.prototype.addListener = function() {
	this.dispatcher.addListener.apply(this.dispatcher, arguments);
	return this;
};

Bot.prototype.on = function() {
	this.dispatcher.on.apply(this.dispatcher, arguments);
	return this;
};

Bot.prototype.off = Bot.prototype.removeListener = function() {
	this.dispatcher.removeListener.apply(this.dispatcher, arguments);
	return this;
};

Bot.prototype.once = function() {
	this.dispatcher.once.apply(this.dispatcher, arguments);
	return this;
};

Bot.prototype.emit = function() {
	this.dispatcher.emit.apply(this.dispatcher, arguments);
	return this;
};

Bot.prototype._setConfigWatch = function(file) {
	var fs = require('fs');

	if (!fs.existsSync(file)) {
		return false;
	}

	if (this._configWatch) { //stop watching config
		this._configWatch.close();
		this._configWatch = null;
	}

	var bot = this;
	this._configWatch = fs.watch(file, {
		persistent: false
	}, function(event, filename) {
		if (event === 'change') {
			bot.loadConfig(filename);
		}
	});

	return true;
};

Bot.prototype.loadConfig = function loadConfig(config, callback) {
	var error = null;
	if (typeof config === 'function' && typeof callback === 'undefined') {
		callback = config;
		config = undefined;
	}

	if (typeof config === 'string') {
		this._configFile = BOT_DIR + '/' + require('path').basename(config);
	} else if (config instanceof Object) {
		this._configFile = '';
	} else {
		this._configFile = BOT_DIR + '/config.json';
	}

	try {
		if (this._configFile) {
			require.cache[this._configFile] = null;
			config = require(this._configFile);
			this._setConfigWatch(this._configFile);
		}

		this.config.clear(); //throw out old config
		this.config.load(config); //load new config
	} catch (e) {
		logger.error('Cannot load config! ');
		error = new Error('Cannot load config! ' + e);
	}

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

	if (callback) callback(error, this.config);
	else if (error) throw error;

	logger.info('Config loaded!');

	if (logger) {
		logger.debugging = this.config.bot.debug ? true : false;
	}

	return this;
};

Bot.prototype.saveConfig = function(savefile) {
	var fs = require('fs');

	//get only basename
	savefile = require('path').basename(savefile);

	//blocking write
	try {
		fs.writeFileSync(BOT_DIR + '/' + savefile, JSON.stringify(this.config, null, 4));
		logger.info('Config saved to \'' + savefile + '\'.');
	} catch (err) {
		logger.error('Failed to save config with error: ' + err);
	}
};

Bot.prototype.loadModules = function loadModules(modules, callback) {
	var bot = this;

	if (typeof modules === 'function' && typeof callback === 'undefined') {
		callback = modules;
		modules = {};
	}

	if (typeof bot.config.bot === 'undefined') { //we need atleast empty bot config
		bot.config.bot = {
			'modules': 'modules.json'
		};
	}

	var error = null;
	if (typeof modules === 'string') {
		bot.config.bot.modules = modules;
		modules = {};
	} else if (typeof modules === 'object' && modules instanceof Array) {
		var tmp = modules.slice(0);
		modules = {};
		for (var i = 0; i < tmp.length; i++) {
			modules[tmp[i]] = true;
		}

	} else if (typeof modules !== 'object' && typeof bot.config.bot.modules === 'string') {
		modules = {};
	} else if (typeof modules !== 'object') {
		logger.error('Modules was nor Object nor Array nor String! Trying to load default \'modules.json\'.');
		error = new Error('Modules was nor Object nor Array nor String! Trying to load default \'modules.json\'.');

		modules = {};
	}

	//first load core modules
	bot._core_modules.forEach(function(name) {
		bot.modules.load(name);
	});

	//then custom modules
	if (Object.keys(modules).length <= 0) {
		try {
			modules = require(BOT_DIR + '/' + bot.config.bot.modules);
		} catch (e) {
			modules = {};
			logger.error('Cannot load modules file \'' + bot.config.bot.modules + '\'!');
			error = new Error('Cannot load modules file \'' + bot.config.bot.modules + '\'!');
		}
	}

	var keys = Object.keys(modules);
	if (keys.length > 0) {
		keys.forEach(function(name) {
			if (modules[name] === true) {
				bot.modules.load(name);
			}
		});
	}

	if (callback) callback(error, bot.modules);
	else if (error) throw error;

	logger.info('Modules loaded!');
	return bot;
};

Bot.prototype.unloadModules = function() {
	var bot = this;
	//unprotect core modules
	bot._core_modules.forEach(function(name) {
		bot.modules.protect(name, false);
	});
	//unload all modules
	bot.modules.getModules().reverse().forEach(function(m) {
		try {
			bot.modules.unload(m);
		} catch (e) {
			//ignore all errors
			//just note them
			logger.warn('Caught error on module \'' + m + '\' unload: ' + e);
		}
	});
	logger.info('Modules unloaded!');
};

Bot.prototype.load = function load(names, callback) {
	var bot = this;

	if (!(names instanceof Array)) {
		names = [names];
	}

	var recallback = callback ? function(err, module, mm) {
			callback(err, module, mm, bot);
		} : undefined;

	names.forEach(function(name) {
		bot.modules.load(name, recallback);
	});

	return bot;
};

Bot.prototype.unload = function unload(names, callback) {
	var bot = this;

	if (!(names instanceof Array)) {
		names = [names];
	}

	var recallback = callback ? function(err, mm) {
			callback(err, mm, bot);
		} : undefined;

	names.forEach(function(name) {
		bot.modules.unload(name, recallback);
	});

	return bot;
};

Bot.prototype.reload = function reload(names, callback) {
	var bot = this;

	if (!(names instanceof Array)) {
		names = [names];
	}

	var recallback = callback ? function(err, mm) {
			callback(err, mm, bot);
		} : undefined;

	names.forEach(function(name) {
		bot.modules.reload(name, recallback);
	});

	return bot;
};

Bot.prototype.run = Bot.prototype.start = function run() {
	logger.info('Bot initialization starting...');
	this.emit('init', this);
	return this;
};

Bot.prototype.end = Bot.prototype.stop = function end() {
	if (!this.halting) {
		this.halting = true;
		this.emit('halt', this);
		logger.info('Exiting ...');
		setTimeout(process.exit, 1000); //delay it for a sec
	}
};

module.exports.Bot = Bot;
module.exports.create = function() {
	return new Bot();
};