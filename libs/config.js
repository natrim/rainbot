/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

function Config() {

}

Config.prototype.extend = function(config) {
	for (var p in config) {
		this[p] = config[p];
	}

	return this;
};

module.exports.Config = Config;
module.exports.create = function(config) {
	var c = new Config();
	if (typeof config !== 'undefined') {
		c.extend(config);
	}
	return c;
};