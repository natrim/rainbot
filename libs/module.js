function Module(name) {
	if(typeof name !== 'string' || name === '') {
		throw new Error('You need to specifify module name!');
	}

	name = name.replace(/[^a-zA-Z0-9_\-]+/g, '');

	this.name = name;
	this.fileName = name + ".js";
	this.loadable = true;
	this.loaded = false;
	this.context = {};
	try {
		this.fullPath = this._resolvePath();
	} catch(e) {
		this.loadable = false;
	}
}

//internal file path resolving
Module.prototype._resolvePath = function() {
	return require.resolve(MODULES_DIR + '/' + this.fileName);
};

//called on load
Module.prototype.init = function init() {};

//called on unload
Module.prototype.halt = function halt() {
	//remove from node require cache
	if(this.loaded) delete require.cache[this.fullPath];

	//and remove all listeners
	if(typeof this.dispatcher === 'object') this.dispatcher.clearEvents();
};

Module.prototype.injectDispatcher = function(dispatchBase) {
	if(typeof dispatchBase !== 'object') {
		throw new Error('Wrong dispatcher type for \'' + this.name + '\' module injected!');
	}
	var events = [];
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
				if(obj.event == event && obj.listener == listener) {
					events.splice(i, 1);
					return true;
				}
				return false;
			});
			dispatchBase.removeListener(event, listener);
		},
		removeListener: function(event, listener) {
			events.some(function(obj, i) {
				if(obj.event == event && obj.listener == listener) {
					events.splice(i, 1);
					return true;
				}
				return false;
			});
			dispatchBase.removeListener(event, listener);
		},
		emit: function(event) {
			try {
				dispatchBase.emit.apply(dispatchBase, arguments);
			} catch(e) {
				dispatchBase.emit.call(dispatchBase, 'dispatchError', event, e, this);
			}
		},
		clearEvents: function() {
			events.forEach(function(event) {
				dispatchBase.removeListener(event.event, event.listener);
			});
			events = [];
		}
	};
};

module.exports.Module = Module;
module.exports.create = function(name) {
	return new Module(name);
};