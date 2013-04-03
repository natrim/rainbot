/**
 * Dice
 */

/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */

//dice rolling: roll [XdY] - rolls a Y-sided dice X times, defaults to 1d6
var maxDices = 20;
var minDices = 1;

var maxFaces = 100;
var minFaces = 2;

function roll(dice, faces) {
	var sum = 0,
		results = [];
	dice = Math.max(dice, minDices);
	dice = Math.min(dice, maxDices);
	faces = Math.max(faces, minFaces);
	faces = Math.min(faces, maxFaces);

	for (var i = 0; i < dice; i++) {
		results[i] = Math.floor(Math.random() * faces) + 1;
		sum += results[i];
	}

	return results.join(', ') + (dice > 1 ? ' | SUM = ' + sum : '');
}

exports.init = function(bot) {
	var c = this.require('controls');

	c.addCommand('dice', function(source, args) {
		var dice = ['1d6', 1, 6]; //default 1d6 dice
		if (args[0]) {
			dice = args[0].match(/(\d+)d(\d+)/);

			if (dice === null) {
				source.mention('the only parameter is XdY - where X is number of dice (up to ' + maxDices + ') and Y is sides per dice (up to ' + maxFaces + ')');
				return;
			}

			if (dice[1] > maxDices) {
				source.mention('the max. number of dices is ' + maxDices + ' !');
				return;
			}

			if (dice[1] < minDices) {
				source.mention('the min. number of dices is ' + minDices + ' !');
				return;
			}

			if (dice[2] > maxFaces) {
				source.mention('the max. number of sides for dice is ' + maxFaces + ' !');
				return;
			}

			if (dice[2] < minFaces) {
				source.mention('the min. number of sides for dice is ' + minFaces + ' !');
				return;
			}
		}

		source.action('kicks the dice to you...');

		setTimeout(function() { //delay the result to make the dice seem rolling
			source.mention('you rolled: ' + roll(dice[1], dice[2]));
		}, 800);
	});

};

exports.halt = function(bot) {
	this.require('controls').removeCommand('dice');
};