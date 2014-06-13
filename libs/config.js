'use strict';

function Config() {

}

Object.defineProperty(Config.prototype, 'clear', {
	writable: false,
	configurable: false,
	enumerable: false,
	value: function clear() {
		Object.keys(this).forEach(function (key) {
			delete this[key];
		}, this);
		return this;
	}
});

Object.defineProperty(Config.prototype, 'load', {
	writable: false,
	configurable: false,
	enumerable: false,
	value: function load(config) {
		Object.keys(config).forEach(function (key) {
			this[key] = config[key];
		}, this);
		return this;
	}
});

module.exports.Config = Config;
module.exports.create = function createConfig(config) {
	var c = new Config();
	if (typeof config !== 'undefined') {
		c.load(config);
	}
	return c;
};
