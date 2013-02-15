//set main entry point path
global.BOT_DIR = require('path').resolve(__dirname, '..');
global.LIBS_DIR = require('path').resolve(BOT_DIR, 'libs');
global.MODULES_DIR = require('path').resolve(BOT_DIR, 'modules');

var logger = require(LIBS_DIR + '/logger');

function Bot() {
	//events
	var dispatcher = new(require('events').EventEmitter)();
	dispatcher.setMaxListeners(0); //remove listener limit
	//add MM
	var moduleManager = new(require(LIBS_DIR + '/moduleManager').ModuleManager)(dispatcher);

	dispatcher.on('newListener', function(event, listener) {
		var i, name;
		if(((i = event.indexOf('/')) + 1) && (name = event.substr(0, i))) {
			if(moduleManager.exists(name)) {
				moduleManager.load(name);
			}
		}
	});

	//bind event commands
	this.on = this.addListener = dispatcher.on.bind(dispatcher);
	this.off = this.removeListener = dispatcher.removeListener.bind(dispatcher);
	this.once = dispatcher.once.bind(dispatcher);
	this.emit = dispatcher.emit.bind(dispatcher);

	//bot config
	this.config = {
		'bot': {}
	};

	//bot MM
	this.modules = moduleManager;

	//list of core modules
	this.core_modules = {
		'irc': true
	};
}

Bot.prototype.loadConfig = function loadConfig(config, callback) {
	var bot = this;

	var error = false;
	if(typeof config === 'function' && typeof callback === 'undefined') {
		callback = config;
		config = undefined;
	}

	if(typeof config === 'string') {
		try {
			bot.config = require(BOT_DIR + '/' + config);
		} catch(e) {
			error = true;
			bot.config = {};
		}
	} else if(config instanceof Object) {
		bot.config = config;
	} else {
		try {
			bot.config = require(BOT_DIR + '/config.json');
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
	return bot;
};

Bot.prototype.loadModules = function loadModules(modules, callback) {
	var bot = this;

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
		logger.error('Modules was nor Object nor Array nor String!');
		modules = {};
		error = true;
	}

	//first load core modules
	Object.keys(bot.core_modules).forEach(function(name) {
		if(bot.core_modules[name] === true) {
			bot.modules.load(name);
		}
	});

	//then custom modules
	if(Object.keys(modules).length <= 0) {
		try {
			modules = require(BOT_DIR + '/' + bot.config.bot.modules);
		} catch(e) {
			modules = {};
			logger.error('Cannot load modules file \'' + bot.config.bot.modules + '\'!');
			error = true;
		}
	}

	var keys = Object.keys(modules);
	if(keys.length > 0) {
		keys.forEach(function(name) {
			if(modules[name] === true) {
				bot.modules.load(name);
			}
		});
	}

	if(callback) callback(error, bot.modules);
	return bot;
};

Bot.prototype.load = function load(names, callback) {
	var bot = this;

	if(!(names instanceof Array)) {
		names = [names];
	}

	var recallback = callback ?
	function(err, module, mm) {
		callback(err, module, mm, bot);
	} : undefined;

	names.forEach(function(name) {
		bot.modules.load(name, recallback);
	});

	return bot;
};

Bot.prototype.unload = function unload(names, callback) {
	var bot = this;

	if(!(names instanceof Array)) {
		names = [names];
	}

	var recallback = callback ?
	function(err, mm) {
		callback(err, mm, bot);
	} : undefined;

	names.forEach(function(name) {
		bot.modules.unload(name, recallback);
	});

	return bot;
};

Bot.prototype.run = function run(callback) {
	if(callback) callback(this);

	this.emit('init');

	return this;
};

module.exports.Bot = Bot;
module.exports.create = function() {
	return new Bot();
};