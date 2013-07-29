'use strict';

//check main entry point path
require('./helpers').checkGlobals();

var MODULE = require(LIBS_DIR + '/module').Module;
var logger = require(LIBS_DIR + '/logger');
var EventEmitter = require('events').EventEmitter;

function ModuleManager(dispatcher, config) {
	if (typeof dispatcher === 'object') {
		if (!(dispatcher instanceof EventEmitter)) {
			throw new Error('Wrong dispatcher given!');
		}
		this.dispatcher = dispatcher;
	} else {
		throw new Error('No dispatcher given!');
	}
	if (typeof config === 'object') {
		this.config = config;
	} else {
		throw new Error('No config given!');
	}

	Object.defineProperty(this, '_modules', {
		writable: false,
		configurable: false,
		enumerable: false,
		value: {}
	});

	Object.defineProperty(this, '_protectedModules', {
		writable: false,
		configurable: false,
		enumerable: false,
		value: {}
	});
}

ModuleManager.prototype.reloadConfig = function reloadConfig(config) {
	this.config = config;
	Object.keys(this._modules).forEach(function (module) {
		this._modules[module].injectConfig(this.config);
	}, this);
};

ModuleManager.prototype.getModules = function getModules() {
	return Object.keys(this._modules); //return loaded module names
};

ModuleManager.prototype.exists = ModuleManager.prototype.has = ModuleManager.prototype.contains = function has(name) {
	if (name instanceof MODULE) {
		name = name.name;
	} else if (typeof name !== 'string' || name === '') {
		return false;
	}
	return typeof this._modules[name] !== 'undefined';
};

ModuleManager.prototype.get = ModuleManager.prototype.find = function get(name) {
	if (name instanceof MODULE) {
		return name;
	} else if (typeof name !== 'string' || name === '') {
		return null;
	}
	if (typeof this._modules[name] !== 'undefined') {
		return this._modules[name];
	}
	return null;
};

ModuleManager.prototype.load = ModuleManager.prototype.enable = function load(name) {
	var error = null;
	var module = null;
	if (typeof name !== 'string' || name === '') {
		error = new Error('Please enter a name!');
	} else if (this.exists(name)) {
		error = new Error('Module \'' + name + '\' is already loaded!');
	} else {
		try {
			//this._process = require('child_process').fork(this.filename);
			module = new MODULE(name);
			module.require = this._require.bind(this);
		} catch (e) {
			error = new Error('Error happened during module \'' + name + '\' load: ' + e.message);
			module = null;
		}
		if (!error) {
			if (typeof module.injectConfig === 'function') {
				module.injectConfig(this.config);
			}
			if (typeof module.injectDispatcher === 'function') {
				module.injectDispatcher(this.dispatcher);
			}
			try {
				if (typeof module.init === 'function') {
					module.init();
				}
			} catch (e) {
				error = new Error('Error happened during module \'' + name + '\' init: ' + e.message);
				module = null;
			}

			if (!error) {
				this._modules[name] = module;
				this.dispatcher.emit('module-load', name, this, module);
			}
		}
	}

	logger.debug('Load of \'' + name + '\' module' + (error ? ' failed with error: ' + error.message : ' is success') + '.');

	if (error) {
		throw error;
	}
	return this;
};

ModuleManager.prototype.unload = ModuleManager.prototype.disable = function unload(name) {
	var error = null;
	if (name instanceof MODULE) {
		name = name.name;
	}
	if (typeof name !== 'string' || name === '') {
		error = new Error('Please enter a name!');
	} else {
		if (typeof this._protectedModules[name] !== 'undefined' && this._protectedModules[name] === true) {
			error = new Error('Module \'' + name + '\' is protected!');
		} else if (this.exists(name)) {
			var module = this.get(name);

			try {
				if (typeof module.halt === 'function') {
					module.halt();
				}
			} catch (e) {
				error = new Error('Error happened during module \'' + name + '\' halt: ' + e.message);
			}

			if (!error) {
				delete this._modules[name];
				this.dispatcher.emit('module-unload', name, this, module);
			}
		} else {
			error = new Error('Module \'' + name + '\' is not loaded!');
		}
	}

	logger.debug('Unload of \'' + name + '\' module' + (error ? ' failed with error: ' + error.message : ' is success') + '.');

	if (error) {
		throw error;
	}
	return this;
};

//reload module context
ModuleManager.prototype.reload = function reload(name) {
	var error = null;
	if (name instanceof MODULE) {
		name = name.name;
	}
	if (typeof name !== 'string' || name === '') {
		error = new Error('Please enter a name!');
	} else {
		var module = this.find(name);

		if (module) {
			try {
				if (typeof module.reload === 'function') {
					module.reload();
				}
			} catch (e) {
				error = new Error('Error happened during module \'' + name + '\' reload: ' + e.message);
			}
		} else {
			error = new Error('Module \'' + name + '\' is not loaded!');
		}

		if (!error) {
			this.dispatcher.emit('module-reload', name, this, module);
		}
	}

	logger.debug('Reload of \'' + name + '\' module' + (error ? ' failed with error: ' + error.message : ' is success') + '.');

	if (error) {
		throw error;
	}
	return this;
};

ModuleManager.prototype.require = function require(name) {
	if (typeof name !== 'string' || name === '') {
		throw new Error('Please enter a name!');
	} else if (!this.exists(name)) {
		this.load(name); //can throw errors
	}

	return this.get(name);
};

/**
 * returns and loads module - used only inside of module
 * @param  String name name of module to return
 * @return Object returns module or null
 */
ModuleManager.prototype._require = function _require(name) {
	try {
		return this.require(name);
	} catch (e) {
		//ignore the error
	}

	return null;
};

ModuleManager.prototype.protect = function protect(name, prot) {
	if (typeof name !== 'string' || name === '') {
		throw new Error('Please enter a name!');
	}

	if (typeof prot === 'undefined') { //emtpy == true
		prot = true;
	}

	this._protectedModules[name] = prot ? true : false;

	return this;
};

module.exports.ModuleManager = ModuleManager;
module.exports.create = function createModuleManager(dispatcher, config) {
	return new ModuleManager(dispatcher, config);
};