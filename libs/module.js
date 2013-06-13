/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

//check main entry point path
if (!global.BOT_DIR) throw new Error('Wrong entry point! No \'BOT_DIR\' defined!');
if (!global.LIBS_DIR) throw new Error('Wrong entry point! No \'LIBS_DIR\' defined!');
if (!global.MODULES_DIR) throw new Error('Wrong entry point! No \'MODULES_DIR\' defined!');

var logger = require(LIBS_DIR + '/logger');
var EventEmitter = require('events').EventEmitter;

function Module(name, module_dir) {
	if (typeof name !== 'string' || name === '') {
		throw new Error('You need to specifify module name!');
	}

	name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');

	this.name = name;
	this.fileName = name + '.js';
	this.loaded = false;
	this.reloading = false;
	this.context = null;
	try {
		this.fullPath = require.resolve((module_dir || MODULES_DIR) + '/' + this.fileName);
	} catch (e) {
		throw new Error('Module \'' + name + '\' does not exists!');
	}
}

//called on load
Module.prototype.init = function init() {
	var error = null;

	if (this.loaded) {
		error = new Error('Module \'' + this.name + '\' is already loaded!');
	}

	if (!error && typeof this.dispatcher !== 'object' && this.dispatcher !== null) error = new Error('No dispatcher given!');
	if (!error && typeof this.config !== 'object' && this.config !== null) error = new Error('No config given!');

	if (!error) {
		try {
			this.__load(); //load context
			if (typeof this.context.init === 'function') this.context.init.call(this, false);
		} catch (e) {
			this.__unload(); //unload if needed
			error = new Error('Failed loading context of \'' + this.name + '\' module! ' + e.message);
		}
	}

	logger.debug('Init of \'' + this.name + '\' module' + (error ? ' failed' : ' is success') + '.' + (error ? ' With error: ' + error.message : ''));

	if (error) throw error;

	return this;
};

//called on unload
Module.prototype.halt = function halt() {
	var error = null;

	if (this.loaded) {
		try {
			if (typeof this.context.halt === 'function') this.context.halt.call(this, false);
			this.__unload();
			if (this.dispatcher && this.dispatcher.clearEvents) this.dispatcher.clearEvents();
		} catch (e) {
			error = new Error('Failed unloading context of \'' + this.name + '\' module! ' + e.message);
		}
	} else {
		error = new Error('Module \'' + this.name + '\' is not loaded!');
	}

	logger.debug('Halt of \'' + this.name + '\' module.' + (error ? ' With error: ' + error.message : ''));

	if (error) throw error;

	return this;
};

Module.prototype.reload = function reload() {
	var error = null;
	if (this.loaded) {
		this.reloading = true;

		try {
			if (typeof this.context.halt === 'function') this.context.halt.call(this, true);
			this.__unload();
			if (this.dispatcher && this.dispatcher.clearEvents) this.dispatcher.clearEvents();

			this.__load();
			if (typeof this.context.init === 'function') this.context.init.call(this, true);
		} catch (e) {
			error = e;
		}

		this.reloading = false;
	} else {
		error = new Error('Module \'' + this.name + '\' is not loaded!');
	}

	logger.debug('Reload of \'' + this.name + '\' module.' + (error ? ' With error: ' + error.message : ''));

	if (error) throw error;

	return this;
};

Module.prototype.injectConfig = function injectConfig(config) {
	var error = null;
	if (!(config instanceof Object)) {
		error = new Error('Config needs to be object!');
	} else {
		if (typeof config[this.name] !== 'object') config[this.name] = {};

		Object.defineProperty(this, 'config', {
			writable: false,
			configurable: false,
			enumerable: true,
			value: config[this.name]
		});
	}

	logger.debug('Module \'' + this.name + '\' Config inject.' + (error ? ' With error: ' + error.message : ''));

	if (error) throw error;

	return this;
};

Module.prototype.injectDispatcher = function injectDispatcher(dispatchBase) {
	var error = null;
	if (!(dispatchBase instanceof EventEmitter)) {
		error = new Error('Wrong dispatcher type for \'' + this.name + '\' module injected!');
	} else {
		var events = [];
		var module = this;
		this.dispatcher = {
			on: function(event, listener) {
				events.push({
					event: event,
					listener: listener
				});
				dispatchBase.on(event, listener);
				return this;
			},
			once: function(event, listener) {
				events.push({
					event: event,
					listener: listener
				});
				dispatchBase.once(event, listener);
				return this;
			},
			off: function(event, listener) {
				return this.removeListener(event, listener);
			},
			addListener: function(event, listener) {
				events.push({
					event: event,
					listener: listener
				});
				dispatchBase.addListener(event, listener);
				return this;
			},
			removeListener: function(event, listener) {
				events.some(function(obj, i) {
					if (obj.event === event && obj.listener === listener) {
						events.splice(i, 1);
						return true;
					}
					return false;
				});
				dispatchBase.removeListener(event, listener);
				return this;
			},
			emit: function(event) {
				var args = [];
				//all emited events needs to be prefixed by module name
				if (!((new RegExp('^' + module.name + '/')).test(event))) {
					event = module.name + '/' + event;
					arguments[0] = event;
				}
				try {
					dispatchBase.emit.apply(dispatchBase, arguments);
				} catch (e) {
					dispatchBase.emit.call(dispatchBase, 'dispatchError', e, event, module);
				}
				return this;
			},
			clearEvents: function() {
				events.forEach(function(event) {
					dispatchBase.removeListener(event.event, event.listener);
				});
				events = [];
				return this;
			}
		};
	}

	logger.debug('Module \'' + this.name + '\' dispatcher inject.' + (error ? ' With error: ' + error.message : ''));

	if (error) throw error;

	return this;
};

/**
 * unload helper
 * @internal
 * @return void
 */
Module.prototype.__unload = function __unload() {
	if (this.loaded) {
		//remove from node require cache
		var module = require.cache[this.fullPath];
		module.children.forEach(function(m) {
			delete require.cache[m.filename];
		});
		delete require.cache[this.fullPath];

		this.loaded = false;
		this.context = null;
	}
};

/**
 * load helper
 * @internal
 * @throws Error
 * @return void
 */
Module.prototype.__load = function __load() {
	if (!this.loaded) {
		try {
			this.context = require(this.fullPath);
		} catch (e) {
			this.context = null;
			throw e;
		}

		if (typeof this.context === 'object' && this.context !== null) {
			this.loaded = true;
		} else {
			this.context = null;
		}
	}
};

Module.prototype.valueOf = Module.prototype.toString = function toString() {
	return this.name;
};

module.exports.Module = Module;
module.exports.create = function createModule(name, module_dir) {
	return new Module(name, module_dir);
};