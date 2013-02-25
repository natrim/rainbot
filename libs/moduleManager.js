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
	} else if(typeof name !== 'string' || name === '') {
		return false;
	}
	return this.modules.some(function(module) {
		return module.name === name;
	});
};

ModuleManager.prototype.get = ModuleManager.prototype.find = function(name) {
	if(name instanceof MODULE) {
		return name;
	} else if(typeof name !== 'string') {
		return null;
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
	var error = null;
	var module = null;
	if(typeof name !== 'string' || name === '') {
		error = new Error('Please enter a name!');
	} else if(this.exists(name)) {
		module = this.get(name);
	} else {
		module = new MODULE(name);
		if(typeof module === 'object' && module.loadable) {
			if(typeof module.injectModuleManager === 'function') module.injectModuleManager(this);
			if(typeof this.dispatcher === 'object' && typeof module.injectDispatcher === 'function') module.injectDispatcher(this.dispatcher);

			this.modules.push(module);

			try {
				if(typeof module.init === 'function') module.init();
			} catch(e) {
				error = e;
			}
		} else {
			error = new Error('Cannot load \'' + name + '\' module!');
			module = null;
		}
	}

	if(callback) callback(error, module, this);
	return this;
};

ModuleManager.prototype.unload = ModuleManager.prototype.disable = function(name, callback) {
	var error = null;
	if(typeof name !== 'string' || name === '') {
		error = new Error('Please enter a name!');
	} else {
		var mm = this;
		if(!this.modules.some(function(module, i) {
			if(module.name === name) {
				//disable event binding on halt with uncatched exception so users gets kicked in face
				if(typeof module.dispatcher === 'object') {
					module.dispatcher.on = module.dispatcher.once = module.dispatcher.addListener = function() {
						throw new Error('You cannot bind events on module halt!');
					};
				}

				if(typeof module.halt === 'function') module.halt();
				mm.modules.splice(i, 1);

				return true;
			}

			return false;
		})) {
			error = new Error('Cannot unload \'' + name + '\' module!');
		}
	}

	if(callback) callback(error, this);
	return this;
};

ModuleManager.prototype.require = function(name) {
	if(typeof name !== 'string' || name === '') {
		return new Error('Please enter a name!');
	} else if(!this.exists(name)) {
		this.load(name);
	}

	return this.get(name);
};

module.exports.ModuleManager = ModuleManager;
module.exports.create = function(dispatcher) {
	return new ModuleManager(dispatcher);
};