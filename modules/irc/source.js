function Source(nick, user, host) {
	this.nick = nick;
	this.user = user;
	this.host = host;
	this.channel = '';
}

Source.prototype.valueOf = Source.prototype.toString = function() {
	return this.nick + (this.host ? (this.user ? '!' + this.user : '') + '@' + this.host : '');
};

Source.fromString = function(string) {
	var m = string.match(/^([^ !@]+)(?:(?:!([^ @]+))?@([^ ]+))?$/);
	if (m) {
		return new Source(m[1], m[2], m[3]);
	} else {
		return null;
	}
};

Source.prototype.reply = Source.prototype.respond = function(msg) {
	this.irc.privMsg(this.channel || this.nick, msg);
};

Source.prototype.mention = function(msg) {
	this.irc.privMsg(this.channel || this.nick, this.nick + ", " + msg);
};

Source.prototype.action = function(msg) {
	this.irc.action(this.channel || this.nick, msg);
};

Source.prototype.tell = Source.prototype.message = function(msg) {
	this.irc.privMsg(this.nick, msg);
};

Source.prototype.note = Source.prototype.notice = function(msg) {
	this.irc.notice(this.nick, msg);
};

exports.Source = Source;