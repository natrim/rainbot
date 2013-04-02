/**
 * Nickserv support - basic
 */

/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

exports.init = function() {
	if (typeof this.config.password === 'undefined') {
		this.config.password = '';
	}

	var module = this;
	var config = this.config;
	var dispatcher = this.dispatcher;

	function identify(source, msg) {
		if (source.nick === 'NickServ' && !source.channel) { //if direct message from NS
			if (msg.match(/^This nickname is registered/)) {
				dispatcher.emit('nickserv/identify');
				if (config.password.trim() !== '') source.reply('IDENTIFY ' + config.password);
			} else if (msg.match(/^You are now identified for/)) {
				dispatcher.emit('nickserv/identified');
			}
		}
	}

	//irc is core module so no need to load it
	//this.require('irc');

	//bind on messages
	dispatcher.on('irc/NOTICE', identify).on('irc/PRIVMSG', identify);
};