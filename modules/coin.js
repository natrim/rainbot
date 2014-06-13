/**
 * Coin throw
 */

'use strict';

exports.init = function () {
	this.addCommand('coin', function (source) {
		source.action('kicks a coin...');
		source.respond((Math.random() < 0.5) ? 'Got Head!' : 'Got Tail!');
	});
};
