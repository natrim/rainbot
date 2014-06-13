/**
 * module used for testing ModuleManager
 */

'use strict';

module.exports.test = 'Pony';

module.exports.init = function (reloading) {
	if (reloading) {
		this.testInit = 'Reload Many ponies!';
	} else {
		this.testInit = 'Many ponies!';
	}
};

module.exports.halt = function () {
	if (this.reloading) {
		this.testHalt = 'Reload No ponies!';
	} else {
		this.testHalt = 'No ponies!';
	}
};
