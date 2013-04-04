/**
 * Coin throw
 */

/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

exports.init = function(bot) {
	this.require('controls').addCommand('coin', function(source, args) {
		source.action('kicks a coin...');
		source.respond((Math.random() < 0.5) ? 'Got Head!' : 'Got Tail!');
	});
};

exports.halt = function(bot) {
	this.require('controls').removeCommand('coin');
};