function Server() {
	this.hostname = '';
	this.port = 6667;
	this.secured = false;

	this.currentNick = '';

	this.lastMsgTo = '';
	this.lastMsgTime = 0;
	this.lastMsg = '';

	this.socket = null;
	this.write = function() {};
	this.end = function() {};
}

Server.prototype.valueOf = Server.prototype.toString = function() {
	return (this.secured ? 'tls://' : 'tcp://') + this.hostname + ':' + this.port;
};

exports.Server = Server;