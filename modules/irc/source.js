/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

function Source(irc, nick, user, host) {
	this.nick = nick;
	this.user = user;
	this.host = host;
	this.channel = '';

	Object.defineProperty(this, 'irc', {
		value: irc,
		enumerable: false,
		writable: false,
		configurable: false
	});
}

Source.prototype.valueOf = Source.prototype.toString = function() {
	return this.nick + (this.host ? (this.user ? '!' + this.user : '') + '@' + this.host : '');
};

Source.fromString = function(irc, string) {
	var m = string.match(/^([^ !@]+)(?:(?:!([^ @]+))?@([^ ]+))?$/);
	if (m) {
		return new Source(irc, m[1], m[2], m[3]);
	} else {
		return null;
	}
};

Source.prototype.reply = Source.prototype.respond = function(msg) {
	return this.irc.privMsg(this.channel || this.nick, msg) !== null;
};

Source.prototype.mention = function(msg) {
	return this.irc.privMsg(this.channel || this.nick, this.nick + ", " + msg) !== null;
};

Source.prototype.action = function(msg) {
	return this.irc.action(this.channel || this.nick, msg) !== null;
};

Source.prototype.tell = Source.prototype.message = function(msg) {
	return this.irc.privMsg(this.nick, msg) !== null;
};

Source.prototype.note = Source.prototype.notice = function(msg) {
	return this.irc.notice(this.nick, msg) !== null;
};

exports.Source = Source;