function Config() {

}

Config.prototype.extend = function(config) {
	for(var p in config) {
		this[p] = config[p];
	}

	return this;
};

module.exports.Config = Config;
module.exports.create = function() {
	return new Config();
};