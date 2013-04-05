/**
 * Dice
 */

/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

function Dice() {
	//dice rolling: roll [XdY] - rolls a Y-sided dice X times, defaults to 1d6
	this.maxDices = 20;
	this.minDices = 1;

	this.maxFaces = 100;
	this.minFaces = 1;
}

Dice.prototype.roll = function(dice, faces) {
	var sum = 0,
		results = [];
	dice = Math.max(dice, this.minDices);
	dice = Math.min(dice, this.maxDices);
	faces = Math.max(faces, this.minFaces);
	faces = Math.min(faces, this.maxFaces);

	for (var i = 0; i < dice; i++) {
		results[i] = Math.floor(Math.random() * faces) + 1;
		sum += results[i];
	}

	return results.join(', ') + (dice > 1 ? ' | SUM = ' + sum : '');
};

Dice.prototype.reply = function(source, args) {
	var dice = ['1d6', 1, 6]; //default 1d6 dice
	if (args[0]) {
		dice = args[0].match(/(\d+)d(\d+)/);

		if (dice === null) {
			source.mention('the only parameter is XdY - where X is number of dice (up to ' + this.maxDices + ') and Y is sides per dice (up to ' + this.maxFaces + ')');
			return;
		}

		if (dice[1] > this.maxDices) {
			source.mention('the max. number of dices is ' + this.maxDices + ' !');
			return;
		}

		if (dice[1] < this.minDices) {
			source.mention('the min. number of dices is ' + this.minDices + ' !');
			return;
		}

		if (dice[2] > this.maxFaces) {
			source.mention('the max. number of sides for dice is ' + this.maxFaces + ' !');
			return;
		}

		if (dice[2] < this.minFaces) {
			source.mention('the min. number of sides for dice is ' + this.minFaces + ' !');
			return;
		}
	}

	source.action('kicks the dice to you...');
	source.mention('you rolled: ' + this.roll(dice[1], dice[2]));
};

exports.init = function(bot) {
	this.dice = new Dice();

	if (typeof this.config.maxDices === 'number') this.dice.maxDices = this.config.maxDices;
	if (typeof this.config.minDices === 'number') this.dice.minDices = this.config.minDices;
	if (typeof this.config.maxFaces === 'number') this.dice.maxFaces = this.config.maxFaces;
	if (typeof this.config.minFaces === 'number') this.dice.minFaces = this.config.minFaces;

	//the sides will stop between 1-100
	if (this.dice.minFaces < 1) this.dice.minFaces = 1;
	if (this.dice.maxFaces > 100) this.dice.maxFaces = 100;

	//throw atleast one!
	if (this.dice.minDices < 1) this.dice.minDices = 1;
	//not realy sure if somepony want to throw more than 1k dices
	if (this.dice.maxDices > 1000) this.dice.maxDices = 1000;

	this.addCommand('dice', this.dice.reply.bind(this.dice));
};