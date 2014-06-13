'use strict';

//check main entry point path
require('./helpers').checkGlobals();

var logger = require(LIBS_DIR + '/logger');
var EventEmitter = require('events').EventEmitter;

function Module(name) {
	if (typeof name !== 'string' || name === '') {
		throw new Error('You need to specifify module name!');
	}

	Object.defineProperty(this, 'name', {
		writable: false,
		configurable: false,
		enumerable: true,
		value: name.replace(/[^a-zA-Z0-9_\-]+/g, '')
	});

	try {
		Object.defineProperty(this, 'filename', {
			writable: false,
			configurable: false,
			enumerable: true,
			value: require.resolve(MODULES_DIR + '/' + this.name)
		});
	} catch (e) {
		throw new Error('Module \'' + this.name + '\' does not exists!');
	}

	this.loaded = false;
	this.reloading = false;
	this.context = null;
}

//empty require - MM will inject own method on module load
Module.prototype.require = function require() {
	return null;
};

//called on load
Module.prototype.init = function init() {
	var error = null;

	if (this.loaded) {
		error = new Error('Module \'' + this.name + '\' is already loaded!');
	}

	if (!error && typeof this.dispatcher !== 'object' && this.dispatcher !== null) {
		error = new Error('No dispatcher given!');
	}
	if (!error && typeof this.config !== 'object' && this.config !== null) {
		error = new Error('No config given!');
	}

	if (!error) {
		try {
			this.__load(); //load context
			if (this.context !== null && typeof this.context.init === 'function') {
				this.context.init.call(this, false);
			}
		} catch (e) {
			this.__unload(); //unload if needed
			error = new Error('Failed loading context of \'' + this.name + '\' module! ' + e.message);
		}
	}

	logger.debug('Init of \'' + this.name + '\' module' + (error ? ' failed' : ' is success') + '.' + (error ? ' With error: ' + error.message : ''));

	if (error) {
		throw error;
	}
	return this;
};

//called on unload
Module.prototype.halt = function halt() {
	var error = null;

	if (this.loaded) {
		try {
			if (this.context !== null && typeof this.context.halt === 'function') {
				this.context.halt.call(this, false);
			}
			this.__unload();
			if (this.dispatcher && this.dispatcher.clearEvents) {
				this.dispatcher.clearEvents();
			}
		} catch (e) {
			error = new Error('Failed unloading context of \'' + this.name + '\' module! ' + e.message);
		}
	} else {
		error = new Error('Module \'' + this.name + '\' is not loaded!');
	}

	logger.debug('Halt of \'' + this.name + '\' module.' + (error ? ' With error: ' + error.message : ''));

	if (error) {
		throw error;
	}
	return this;
};

Module.prototype.reload = function reload() {
	var error = null;
	if (this.loaded) {
		this.reloading = true;

		try {
			if (this.context !== null && typeof this.context.halt === 'function') {
				this.context.halt.call(this, true);
			}
			this.__unload();
			if (this.dispatcher && this.dispatcher.clearEvents) {
				this.dispatcher.clearEvents();
			}
			this.__load();
			if (this.context !== null && typeof this.context.init === 'function') {
				this.context.init.call(this, true);
			}
		} catch (e) {
			error = e;
		}

		this.reloading = false;
	} else {
		error = new Error('Module \'' + this.name + '\' is not loaded!');
	}

	logger.debug('Context reload of \'' + this.name + '\' module.' + (error ? ' With error: ' + error.message : ''));

	if (error) {
		throw error;
	}
	return this;
};

Module.prototype.injectConfig = function injectConfig(config) {
	var error = null;
	if (!(config instanceof Object)) {
		error = new Error('Config needs to be object!');
	} else {
		if (typeof config[this.name] !== 'object') {
			config[this.name] = {};
		}

		if (typeof this.config === 'undefined') {
			Object.defineProperty(this, 'config', {
				configurable: false,
				enumerable: true,
				get: function () {
					return config[this.name];
				}
			});
		}
	}

	logger.debug('Module \'' + this.name + '\' Config inject.' + (error ? ' With error: ' + error.message : ''));

	if (error) {
		throw error;
	}
	return this;
};

Module.prototype.injectDispatcher = function injectDispatcher(dispatchBase) {
	var error = null;
	if (!(dispatchBase instanceof EventEmitter)) {
		error = new Error('Wrong dispatcher type for \'' + this.name + '\' module injected!');
	} else {
		var events = [];
		var eventTest = new RegExp('^' + this.name + '/');
		var module = this;
		this.dispatcher = {
			on: function on(event, listener) {
				events.push({
					event: event,
					listener: listener
				});
				dispatchBase.on(event, listener);
				return this;
			},
			once: function once(event, listener) {
				events.push({
					event: event,
					listener: listener
				});
				dispatchBase.once(event, listener);
				return this;
			},
			off: function off(event, listener) {
				return this.removeListener(event, listener);
			},
			addListener: function addListener(event, listener) {
				events.push({
					event: event,
					listener: listener
				});
				dispatchBase.addListener(event, listener);
				return this;
			},
			removeListener: function removeListener(event, listener) {
				events.some(function (obj, i) {
					if (obj.event === event && obj.listener === listener) {
						events.splice(i, 1);
						return true;
					}
					return false;
				});
				dispatchBase.removeListener(event, listener);
				return this;
			},
			emit: function emit(event) {
				var args;
				//all emited events needs to be prefixed by module name
				if (!(eventTest.test(event))) {
					event = module.name + '/' + event;
					args = Array.prototype.slice.call(arguments, 1); //convert arguments to Array and remove first argument
					args.unshift(event); //put new event as first argument
				}
				try {
					dispatchBase.emit.apply(dispatchBase, args || arguments);
				} catch (e) {
					dispatchBase.emit.call(dispatchBase, 'dispatchError', e, event, module);
				}
				return this;
			},
			clearEvents: function clearEvents() {
				events.forEach(function (event) {
					dispatchBase.removeListener(event.event, event.listener);
				});
				events = [];
				return this;
			}
		};
	}

	logger.debug('Module \'' + this.name + '\' dispatcher inject.' + (error ? ' With error: ' + error.message : ''));

	if (error) {
		throw error;
	}
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
		var module = require.cache[this.filename];
		module.children.forEach(function (m) {
			delete require.cache[m.filename];
		});
		delete require.cache[this.filename];

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
			this.context = require(this.filename);
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
module.exports.create = function createModule(name) {
	return new Module(name);
};
