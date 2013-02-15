var logger = require(LIBS_DIR + '/logger');

var MODULE = require(LIBS_DIR + '/module').Module;

function ModuleManager(dispatcher) {
	this.modules = [];
	this.dispatcher = dispatcher;
}

ModuleManager.prototype.getModules = function() {
	return this.modules;
};

ModuleManager.prototype.exists = ModuleManager.prototype.has = ModuleManager.prototype.contains = function(name) {
	if(name instanceof MODULE) {
		name = name.name;
	}
	return this.modules.some(function(module) {
		return module.name === name;
	});
};

ModuleManager.prototype.get = ModuleManager.prototype.find = function(name) {
	if(name instanceof MODULE) {
		return name;
	}
	var module = null;
	this.modules.some(function(m) {
		if(m.name === name) {
			module = m;
			return true;
		}
		return false;
	});
	return module;
};

ModuleManager.prototype.load = ModuleManager.prototype.enable = function(name, callback) {
	var error = false;
	var module;
	if(!this.exists(name)) {
		module = new MODULE(name);
		if(module.loaded) {
			if(typeof this.dispatcher === 'object' && typeof module.injectDispatcher === 'function') module.injectDispatcher(this.dispatcher);
		} else {
			error = true;
			logger.error('Cannot load \'' + name + '\' module!');
		}

		if(!error) {
			this.modules.push(module);
			if(typeof module.init === 'function') module.init();
		}
	}

	if(callback) callback(error, module, this);
	return this;
};

//pokud je callback tak bude asynchrone jinak synchrone
ModuleManager.prototype.unload = ModuleManager.prototype.disable = function(name, callback) {
	var mm = this;
	var error = !this.modules.some(function(module, i) {
		if(module.name === name) {
			if(typeof module.halt === 'function') module.halt();
			mm.modules.splice(i, 1);

			return true;
		}

		return false;
	});

	if(callback) callback(error, this);
	return this;
};

module.exports.ModuleManager = ModuleManager;
module.exports.create = function(dispatcher) {
	return new ModuleManager(dispatcher);
};