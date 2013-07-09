/*
	BOOTSTRAP FOR TESTS
 */

var path = require('path');

//set main entry point path
global.BOT_DIR = path.resolve(__dirname, '..');
global.LIBS_DIR = path.resolve(BOT_DIR, 'libs');
global.MODULES_DIR = path.resolve(BOT_DIR, 'modules');

//disable logger
require(LIBS_DIR + '/logger').enabled = false;

//increase listeners - many tests
process.setMaxListeners(100);