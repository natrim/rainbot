/**
 * IRC file log
 */

'use strict';

var fs = require('fs');

exports.init = function (reload) {
	if (typeof this.config.logfile === 'undefined' || this.config.logfile === '') {
		return;
	}

	if (!reload || !this.logfile) {
		this.logfile = fs.createWriteStream(this.config.logfile, {
			flags: 'a',
			encoding: 'utf-8'
		});
	}

	var m = this;
	this.dispatcher.on('irc/RECV', function (msg) {
		m.logfile.write(Math.floor(Date.now() / 1000) + ' ' + msg + '\n');
	});
	this.dispatcher.on('irc/SEND', function (msg) {
		m.logfile.write(Math.floor(Date.now() / 1000) + ' ' + msg + '\n');
	});
};

exports.halt = function (reload) {
	if (!reload && this.logfile) {
		this.logfile.end();
	}
};