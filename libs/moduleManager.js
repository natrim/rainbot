var MODULE = require(LIBS_DIR + '/module').Module;

var logger = require(LIBS_DIR + '/logger');

function ModuleManager(dispatcher, config) {
	this._modules = {};
	if (typeof dispatcher === 'object') {
		this.dispatcher = dispatcher;
	} else {
		this.dispatcher = new(require('events').EventEmitter)();
		this.dispatcher.setMaxListeners(0);
	}
	if (typeof config === 'object') {
		this.config = config;
	} else {
		this.config = require(LIBS_DIR + '/config').create();
	}
}

ModuleManager.prototype.getModules = function() {
	return Object.keys(this._modules); //return loaded module names
};

ModuleManager.prototype.exists = ModuleManager.prototype.has = ModuleManager.prototype.contains = function(name) {
	if (name instanceof MODULE) {
		name = name.name;
	} else if (typeof name !== 'string' || name === '') {
		return false;
	}
	return this._modules[name] !== undefined;
};

ModuleManager.prototype.get = ModuleManager.prototype.find = function(name) {
	if (name instanceof MODULE) {
		return name;
	} else if (typeof name !== 'string' || name === '') {
		return null;
	}
	if (this._modules[name] !== undefined) {
		return this._modules[name];
	}
	return null;
};

ModuleManager.prototype.load = ModuleManager.prototype.enable = function(name, callback) {
	var error = null;
	var module = null;
	if (typeof name !== 'string' || name === '') {
		error = new Error('Please enter a name!');
	} else if (this.exists(name)) {
		error = new Error('Module \'' + name + '\' is already loaded!');
	} else {
		if (typeof this[name] !== 'undefined') {
			error = new Error('Reserved module name! Please rename your module!');
		} else {
			try {
				module = new MODULE(name);
			} catch (e) {
				error = new Error('Error happened during module construction: ' + e.message);
				module = null;
			}
			if (module instanceof MODULE) {
				if (typeof module.injectModuleManager === 'function') module.injectModuleManager(this);
				if (typeof module.injectConfig === 'function') module.injectConfig(require(LIBS_DIR + '/config').create(this.config[name]));
				if (typeof module.injectDispatcher === 'function') module.injectDispatcher(this.dispatcher);

				try {
					if (typeof module.init === 'function') module.init();
				} catch (e) {
					error = new Error('Error happened during module initialization: ' + e.message);
					module = null;
				}

				if (!error) {
					this._modules[name] = module;

					//add as property for quick access
					Object.defineProperty(this, name, {
						configurable: true,
						value: module
					});
				}
			} else {
				error = new Error('Cannot load \'' + name + '\' module!');
				module = null;
			}
		}
	}

	logger.debug('Load of \'' + name + '\' module' + (error ? ' failed' : ' is success') + '.');

	if (callback) callback(error, error ? name : module, this);
	else if (error) throw error;
	return this;
};

ModuleManager.prototype.unload = ModuleManager.prototype.disable = function(name, callback) {
	var error = null;
	if (name instanceof MODULE) {
		name = name.name;
	}
	if (typeof name !== 'string' || name === '') {
		error = new Error('Please enter a name!');
	} else {
		if (this.exists(name)) {
			var module = this.get(name);

			//disable event binding on halt with uncatched exception so users gets kicked in face
			if (typeof module.dispatcher === 'object') {
				module.dispatcher.on = module.dispatcher.once = module.dispatcher.addListener = function() {
					throw new Error('You cannot bind events on module halt!');
				};
			}

			try {
				if (typeof module.halt === 'function') module.halt();
			} catch (e) {
				//ignore all exceptions in halt
				logger.warn('Got error in module \'' + name + '\' halt: ' + e);
			}

			//puff it
			delete this._modules[name];
			if (this[name] === module) delete this[name];
		} else {
			error = new Error('Module \'' + name + '\' is not loaded!');
		}
	}

	logger.debug('Unload of \'' + name + '\' module' + (error ? ' failed' : ' is success') + '.');

	if (callback) callback(error, name, this);
	else if (error) throw error;
	return this;
};

//reload module context
ModuleManager.prototype.reload = function(name, callback) {
	var mm = this;
	var error = null;

	var module = this.find(name);

	if (module) {
		try {
			module.reload(undefined, require(LIBS_DIR + '/config').create(this.config[name])); //reload with new config
		} catch (e) {
			error = new Error('Error happened during module reload: ' + e.message);
		}
	} else {
		error = new Error('Module \'' + name + '\' is not loaded!');
	}

	logger.debug('Reload of \'' + name + '\' module' + (error ? ' failed' : ' is success') + '.');

	if (callback) callback(error, module, this);
	else if (error) throw error;

	return this;
};

ModuleManager.prototype.require = function(name) {
	if (typeof name !== 'string' || name === '') {
		throw new Error('Please enter a name!');
	} else if (!this.exists(name)) {
		this.load(name);
	}

	return this.get(name);
};

module.exports.ModuleManager = ModuleManager;
module.exports.create = function(dispatcher) {
	return new ModuleManager(dispatcher);
};