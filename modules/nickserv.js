/**
 * Nickserv support - basic
 */

'use strict';

exports.init = function () {
	if (typeof this.config.password === 'undefined') {
		this.config.password = '';
	}

	var config = this.config;
	var dispatcher = this.dispatcher;

	function identify(source, msg) {
		if (source.nick === 'NickServ' && !source.channel) { //if direct message from NS
			if (msg.match(/^This nickname is registered/)) {
				dispatcher.emit('nickserv/identify');
				if (config.password.trim() !== '') {
					source.reply('IDENTIFY ' + config.password);
				}
			} else if (msg.match(/^You are now identified for/)) {
				dispatcher.emit('nickserv/identified');
			}
		}
	}

	//bind on messages
	dispatcher.on('irc/NOTICE', identify).on('irc/PRIVMSG', identify);
};