'use strict';

//trim some strings
if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

function Server(host, port, ssl) {
	this.hostname = '';
	this.port = 6667;
	this.secured = false;

	if (typeof host === 'string') {
		this.hostname = host;
	}
	if (typeof port === 'number') {
		this.port = port;
	}
	if (typeof ssl === 'boolean') {
		this.secured = ssl;
	}
	if (typeof this.port !== 'number') {
		this.port = 6667;
	}

	//throw error when hostname not set
	if (typeof this.hostname !== 'string' || this.hostname.trim() === '') {
		throw new Error('Specify server hostname!');
	}

	this.connected = false;
	this.lastNick = '';
	this.currentNick = '';

	this.lastMsgTo = '';
	this.lastMsgTime = 0;
	this.lastMsg = '';

	this.socket = null;
	this.write = function () {};
	this.end = function () {};
}

Server.prototype.valueOf = Server.prototype.toString = function () {
	return (this.secured ? 'tls://' : 'tcp://') + this.hostname + ':' + this.port;
};

exports.Server = Server;