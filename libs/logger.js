/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

function Logger() {
	this.enabled = true;
	this.debugging = false;
	this.lastMessage = '';
}

Logger.prototype.onBeforeLog = function onBeforeLog() {};
Logger.prototype.onAfterLog = function onAfterLog() {};

var colorize = {
	//styles
	'bold': ['\x1B[1m', '\x1B[22m'],
	'italic': ['\x1B[3m', '\x1B[23m'],
	'underline': ['\x1B[4m', '\x1B[24m'],
	'inverse': ['\x1B[7m', '\x1B[27m'],
	'strikethrough': ['\x1B[9m', '\x1B[29m'],
	//grayscale
	'white': ['\x1B[37m', '\x1B[39m'],
	'grey': ['\x1B[90m', '\x1B[39m'],
	'black': ['\x1B[30m', '\x1B[39m'],
	//colors
	'blue': ['\x1B[34m', '\x1B[39m'],
	'cyan': ['\x1B[36m', '\x1B[39m'],
	'green': ['\x1B[32m', '\x1B[39m'],
	'magenta': ['\x1B[35m', '\x1B[39m'],
	'red': ['\x1B[31m', '\x1B[39m'],
	'yellow': ['\x1B[33m', '\x1B[39m']
};

Object.keys(colorize).forEach(function prepareColors(colorName) {
	var colorColor = colorize[colorName];
	colorize[colorName] = function(val) {
		return colorColor[0] + val + colorColor[1];
	};
});

Logger.prototype.log = function log(msg, level) {
	if (!this.enabled) {
		this.lastMessage = '';
		return false;
	}

	if (msg instanceof Error) {
		msg = msg.message;
		if (typeof level === 'undefined' || level === null) level = 'error';
	}

	var handled = this.onBeforeLog.call(this, msg, level) || false;
	if (!handled) {
		switch (level) {
			case 'error':
				this.lastMessage = colorize.red('[ERROR] ') + msg;
				console.error(this.lastMessage);
				break;
			case 'warn':
				this.lastMessage = colorize.yellow('[WARNING] ') + msg;
				console.warn(this.lastMessage);
				break;
			case 'info':
				this.lastMessage = colorize.cyan('[INFO] ') + msg;
				console.info(this.lastMessage);
				break;
			case 'debug':
				if (this.debugging) {
					this.lastMessage = colorize.magenta('[DEBUG] ') + msg;
					console.log(this.lastMessage);
				} else {
					this.lastMessage = '';
				}
				break;
			default:
				this.lastMessage = msg;
				console.log(this.lastMessage);
		}
	}
	this.onAfterLog.call(this, handled || false, msg, level);
	return true;
};

Logger.prototype.error = function error(msg) {
	return this.log(msg, 'error');
};

Logger.prototype.warn = Logger.prototype.warning = function warning(msg) {
	return this.log(msg, 'warn');
};

Logger.prototype.info = function info(msg) {
	return this.log(msg, 'info');
};

Logger.prototype.debug = function debug(msg) {
	return this.log(msg, 'debug');
};

module.exports = new Logger();
module.exports.Logger = Logger;
module.exports.colorize = colorize;