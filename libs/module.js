var logger = require(LIBS_DIR + '/logger');

function Module(name) {
	if (typeof name !== 'string' || name === '') {
		throw new Error('You need to specifify module name!');
	}

	name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');

	this.name = name;
	this.fileName = name + ".js";
	this.loaded = false;
	this.reloading = false;
	this.context = null;
	try {
		this.fullPath = this._resolvePath();
	} catch (e) {
		throw new Error('Module \'' + name + '\' does not exists in MODULE_DIR!');
	}
}

//internal file path resolving
Module.prototype._resolvePath = function() {
	return require.resolve(MODULES_DIR + '/' + this.fileName);
};

//called on load
Module.prototype.init = function init(callback) {
	var error = null;
	try {
		this.context = require(this.fullPath);
		this.loaded = true;
	} catch (e) {
		error = new Error('Failed loading context of \'' + this.name + '\' module! ' + e.message);
	}

	if (this.loaded) {
		//self inject new dispatcher if none
		if (typeof this.dispatcher !== 'object') this.injectDispatcher(new(require('events').EventEmitter)());

		//self inject empty config if none
		if (typeof this.config !== 'object') this.injectConfig(new(require(LIBS_DIR + '/config').Config)());

		//init the context
		if (typeof this.context.init === 'function') this.context.init.call(this, false);
	}

	logger.debug('Init of \'' + this.name + '\' module' + (error ? ' failed' : ' is success') + '.');

	if (callback) callback(error, this);
	else if (error) throw error;

	return this;
};

//called on unload
Module.prototype.halt = function halt(callback) {
	if (this.loaded && typeof this.context.halt === 'function') this.context.halt.call(this, false);

	//remove from node require cache
	if (this.loaded) {
		var module = require.cache[this.fullPath];

		module.children.forEach(function(m) {
			delete require.cache[m.filename];
		});
		delete require.cache[this.fullPath];
	}

	//reset
	this.loaded = false;
	this.context = null;

	//and remove all listeners
	if (this.dispatcher && this.dispatcher.clearEvents) this.dispatcher.clearEvents();

	logger.debug('Halt of \'' + this.name + '\' module.');

	//callback
	if (callback) callback(null, this);

	return this;
};

Module.prototype.reload = function reload(callback, config) {
	var error = null;
	if (this.loaded) {
		this.reloading = true;

		if (typeof this.context.halt === 'function') this.context.halt.call(this, true);

		var module = require.cache[this.fullPath];
		module.children.forEach(function(m) {
			delete require.cache[m.filename];
		});
		delete require.cache[this.fullPath];

		this.loaded = false;

		if (this.dispatcher && this.dispatcher.clearEvents) this.dispatcher.clearEvents();

		try {
			this.context = require(this.fullPath);
			this.loaded = true;
		} catch (e) {
			error = new Error('Failed loading context of \'' + this.name + '\' module! ' + e.message);
		}
		if (this.loaded) {
			if (config) this.config = config;
			if (typeof this.context.init === 'function') this.context.init.call(this, true);
		}

		this.reloading = false;
	} else {
		error = new Error('Module \'' + this.name + '\' is not loaded!');
	}

	if (callback) callback(error, this);
	else if (error) throw error;

	return this;
};

Module.prototype.injectConfig = function(config, callback) {
	this.config = config;
	if (callback) callback(null, this);

	logger.debug('Module \'' + this.name + '\' Config inject.');

	return this;
};

Module.prototype.injectModuleManager = function(mm, callback) {
	this.require = mm.require.bind(mm);
	if (callback) callback(null, this);

	logger.debug('Module \'' + this.name + '\' MM inject.');

	return this;
};

Module.prototype.injectDispatcher = function(dispatchBase, callback) {
	var error = null;
	if (typeof dispatchBase !== 'object' || dispatchBase === null) {
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
			addListener: function(event, listener) {
				events.push({
					event: event,
					listener: listener
				});
				dispatchBase.addListener(event, listener);
				return this;
			},
			off: function(event, listener) {
				events.some(function(obj, i) {
					if (obj.event == event && obj.listener == listener) {
						events.splice(i, 1);
						return true;
					}
					return false;
				});
				dispatchBase.removeListener(event, listener);
				return this;
			},
			removeListener: function(event, listener) {
				events.some(function(obj, i) {
					if (obj.event == event && obj.listener == listener) {
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
				if (event.search(module.name + '/') === -1) {
					for (var val in arguments) {
						args.push(val);
					}
					event = module.name + '/' + event;
					args[0] = event;
				} else {
					args = arguments;
				}
				try {
					dispatchBase.emit.apply(dispatchBase, args);
				} catch (e) {
					dispatchBase.emit.call(dispatchBase, 'dispatchError', event, e, module);
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

	logger.debug('Module \'' + this.name + '\' dispatcher inject.');

	if (callback) callback(error, this.dispatcher, this);
	else if (error) throw error;

	return this;
};

Module.prototype.valueOf = Module.prototype.toString = function() {
	return this.name;
};

module.exports.Module = Module;
module.exports.create = function(name) {
	return new Module(name);
};