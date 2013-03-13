exports.init = function() {
	'use strict';

	if (typeof this.config.password === 'undefined') {
		this.config.password = '';
	}

	var module = this;
	var config = this.config;

	function identify(source, msg) {
		if (source.nick === 'NickServ' && !source.channel) { //if direct message from NS
			if (msg.match(/^This nickname is registered/)) {
				module.emit('nickserv/identify');
				if (config.password.trim() !== '') source.reply('IDENTIFY ' + config.password);
			} else if (msg.match(/^You are now identified for/)) {
				module.emit('nickserv/identified');
			}
		}
	}

	//irc is core module so no need to load it
	//this.require('irc');

	//bind on messages
	this.on('irc/NOTICE', identify).on('irc/PRIVMSG', identify);
};