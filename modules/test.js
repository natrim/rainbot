//module used for testing ModuleManager

module.exports.test = "Pony";

module.exports.init = function() {
	this.test_init = "Many ponies!";
};

module.exports.halt = function() {
	this.test_halt = "No ponies!";
};