/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

function Config() {

}

Object.defineProperty(Config.prototype, 'clear', {
	writable: false,
	configurable: false,
	enumerable: false,
	value: function() {
		Object.keys(this).forEach(function(val) {
			delete this[val];
		}, this);
		return this;
	}
});

Object.defineProperty(Config.prototype, 'load', {
	writable: false,
	configurable: false,
	enumerable: false,
	value: function(config) {
		for (var p in config) {
			this[p] = config[p];
		}

		return this;
	}
});

module.exports.Config = Config;
module.exports.create = function(config) {
	var c = new Config();
	if (typeof config !== 'undefined') {
		c.load(config);
	}
	return c;
};