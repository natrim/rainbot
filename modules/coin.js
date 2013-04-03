/**
 * Coin throw
 */

/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */

exports.init = function(bot) {

	this.require('controls').addCommand('coin', function(source, args) {
		source.action('kicks a coin...');

		setTimeout(function() { //delay it little to see it flying in air
			source.respond((Math.random() < 0.5) ? 'Got Head!' : 'Got Tail!');
		}, 800);
	});

};

exports.halt = function(bot) {
	this.require('controls').removeCommand('coin');
};