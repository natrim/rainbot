var logger = require(LIBS_DIR + '/logger');

function Module(name) {
	if (typeof name !== 'string' || name === '') {
		throw new Error('You need to specifify module name!');
	}

	name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');

	this.name = name;
	this.fileName = name + ".js";
	this.loadable = true;
	this.loaded = false;
	this.reloading = false;
	this.context = null;
	try {
		this.fullPath = this._resolvePath();
	} catch (e) {
		this.loadable = false;
	}
}

//internal file path resolving
Module.prototype._resolvePath = function() {
	return require.resolve(MODULES_DIR + '/' + this.fileName);
};

//called on load
Module.prototype.init = function init(callback) {
	var error = null;
	if (this.loadable) {
		try {
			this.context = require(this.fullPath);
			this.loaded = true;
		} catch (e) {
			error = new Error('Failed loading context of \'' + this.name + '\' module!');
		}
	} else {
		error = new Error('Cannot load context of unloadable \'' + this.name + '\' module!');
	}

	if (this.loaded) {
		//self inject new dispatcher if none
		if (typeof this.dispatcher !== 'object') this.injectDispatcher(new(require('events').EventEmitter)());

		//self inject empty config if none
		if (typeof this.config !== 'object') this.injectConfig(new(require(LIBS_DIR + '/config').Config)());

		//init the context
		if (typeof this.context.init === 'function') this.context.init.apply(this);
	}

	logger.debug('Init of ' + this.name + (error ? ' failed' : ' success'));

	if (callback) callback(error, this);
	else if (error) throw error;

	return this;
};

//called on unload
Module.prototype.halt = function halt(callback) {
	if (this.loaded && typeof this.context.halt === 'function') this.context.halt.apply(this);
	//remove from node require cache
	if (this.loaded) delete require.cache[this.fullPath];

	//reset
	this.loaded = false;

	//and remove all listeners
	if (this.dispatcher && this.dispatcher.clearEvents) this.dispatcher.clearEvents();

	//callback
	if (callback) callback(null, this);

	logger.debug('Halt of ' + this.name);

	return this;
};

Module.prototype.reload = function reload(callback) {
	var error = null;
	if (this.loaded) {
		this.reloading = true;
		if (typeof this.context.halt === 'function') this.context.halt.apply(this);
		delete require.cache[this.fullPath];
		this.loaded = false;
		try {
			this.context = require(this.fullPath);
			this.loaded = true;
		} catch (e) {
			error = new Error('Failed loading context of \'' + this.name + '\' module!');
		}
		if (typeof this.context.init === 'function') this.context.init.apply(this);
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

	logger.debug('' + this.name + ' Config inject');

	return this;
};

Module.prototype.injectModuleManager = function(mm, callback) {
	this.mm = this.moduleManager = mm;
	this.require = mm.require;
	if (callback) callback(null, this);

	logger.debug('' + this.name + ' MM inject');

	return this;
};

Module.prototype.injectDispatcher = function(dispatchBase, callback) {
	var name = this.name;
	var error = null;
	if (typeof dispatchBase !== 'object' || dispatchBase === null) {
		error = new Error('Wrong dispatcher type for \'' + name + '\' module injected!');
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
			},
			once: function(event, listener) {
				events.push({
					event: event,
					listener: listener
				});
				dispatchBase.once(event, listener);
			},
			addListener: function(event, listener) {
				events.push({
					event: event,
					listener: listener
				});
				dispatchBase.addListener(event, listener);
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
			},
			emit: function(event) {
				//all emited events needs to be prefixed by module name
				if (event.search(name + '/') === -1) {
					event = name + '/' + event;
					arguments[0] = event;
				}
				try {
					dispatchBase.emit.apply(dispatchBase, arguments);
				} catch (e) {
					dispatchBase.emit.call(dispatchBase, 'dispatchError', event, e, module);
				}
			},
			clearEvents: function() {
				events.forEach(function(event) {
					dispatchBase.removeListener(event.event, event.listener);
				});
				events = [];
			}
		};

		this.addListener = function() {
			this.dispatcher.addListener.apply(this.dispatcher, arguments);
			return this;
		};

		this.on = function() {
			this.dispatcher.on.apply(this.dispatcher, arguments);
			return this;
		};

		this.off = this.removeListener = function() {
			this.dispatcher.removeListener.apply(this.dispatcher, arguments);
			return this;
		};

		this.once = function() {
			this.dispatcher.once.apply(this.dispatcher, arguments);
			return this;
		};

		this.emit = function() {
			this.dispatcher.emit.apply(this.dispatcher, arguments);
			return this;
		};
	}

	logger.debug('' + this.name + ' dispatcher inject');

	if (callback) callback(error, this.dispatcher, this);
	else if (error) throw error;

	return this;
};

module.exports.Module = Module;
module.exports.create = function(name) {
	return new Module(name);
};