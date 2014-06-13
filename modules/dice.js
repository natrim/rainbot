/**
 * Dice
 */

'use strict';

function Dice(config) {
	//dice rolling: roll [XdY] - rolls a Y-sided dice X times
	this.config = config;
}

Dice.prototype.roll = function (dice, faces) {
	var sum = 0,
		results = [];
	dice = Math.max(dice, this.config.minDices);
	dice = Math.min(dice, this.config.maxDices);
	faces = Math.max(faces, this.config.minFaces);
	faces = Math.min(faces, this.config.maxFaces);

	for (var i = 0; i < dice; i++) {
		results[i] = Math.floor(Math.random() * faces) + 1;
		sum += results[i];
	}

	return results.join(', ') + (dice > 1 ? ' | SUM = ' + sum : '');
};

Dice.prototype.reply = function (source, args) {
	var dice = ['1d6', 1, 6]; //default 1d6 dice
	if (args[0]) {
		dice = args[0].match(/(\d+)d(\d+)/);

		if (dice === null) {
			source.mention('the only parameter is XdY - where X is number of dice (up to ' + this.config.maxDices + ') and Y is sides per dice (up to ' + this.config.maxFaces + ')');
			return;
		}

		if (dice[1] > this.config.maxDices) {
			source.mention('the max. number of dices is ' + this.config.maxDices + ' !');
			return;
		}

		if (dice[1] < this.config.minDices) {
			source.mention('the min. number of dices is ' + this.config.minDices + ' !');
			return;
		}

		if (dice[2] > this.config.maxFaces) {
			source.mention('the max. number of sides for dice is ' + this.config.maxFaces + ' !');
			return;
		}

		if (dice[2] < this.config.minFaces) {
			source.mention('the min. number of sides for dice is ' + this.config.minFaces + ' !');
			return;
		}
	}

	source.action('kicks the dice to you...');
	source.mention('you rolled: ' + this.roll(dice[1], dice[2]));
};

exports.init = function () {
	if (typeof this.config.maxDices !== 'number') {
		this.config.maxDices = 20;
	}
	if (typeof this.config.minDices !== 'number') {
		this.config.minDices = 1;
	}
	if (typeof this.config.maxFaces !== 'number') {
		this.config.maxFaces = 100;
	}
	if (typeof this.config.minFaces !== 'number') {
		this.config.minFaces = 1;
	}

	//the sides will stop between 1-100
	if (this.config.minFaces < 1) {
		this.config.minFaces = 1;
	}
	if (this.config.maxFaces > 100) {
		this.config.maxFaces = 100;
	}

	//throw atleast one!
	if (this.config.minDices < 1) {
		this.config.minDices = 1;
	}
	//not realy sure if somepony want to throw more than 1k dices
	if (this.config.maxDices > 1000) {
		this.config.maxDices = 1000;
	}

	this.dice = new Dice(this.config);

	this.addCommand('dice', this.dice.reply.bind(this.dice));
};
