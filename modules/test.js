//module used for testing ModuleManager

module.exports.test = "Pony";

module.exports.init = function() {
	if (this.reloading) {
		this.test_init = "Reload Many ponies!";
	} else {
		this.test_init = "Many ponies!";
	}
};

module.exports.halt = function() {
	if (this.reloading) {
		this.test_halt = "Reloading No ponies!";
	} else {
		this.test_halt = "No ponies!";
	}
};