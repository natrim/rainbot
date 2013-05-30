/**
 * Simple WA calc
 */

/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

/* ------------------------------ Includes && Options ----------------- */
var request = require('request');

/* ------------------------------ WolframAlpha ------------------------ */

function WolframAlpha() {
	this.solution = />Solution:<[\s\S]*?alt\s*=\s*\"([^\""]*)\"/;
	this.other = /stringified"\s*:\s*"([^"\r\n]*)/g;
	this.get_other = /stringified"\s*:\s*"/g;
}

WolframAlpha.prototype.search = function(query, callback) {
	var result = {
		url: 'http://www.wolframalpha.com/input/?i=' + encodeURIComponent(query)
	};
	var WA = this;
	request(result.url, function(error, response, body) {
		if (error || response.statusCode !== 200) {
			callback.call(WA, result);
			return;
		}

		var match = body.match(WA.solution);

		if (match) {
			result.data = match[1].replace(/\\\//, '/');
		} else {
			match = body.match(WA.other);
			if (!match || !match[1]) {
				result.data = null;
			} else {
				result.data = match[1].replace(WA.get_other, '').replace(/\\n/g, ' ').replace(/\\\//, '/');
			}
		}

		callback.call(WA, result);
	});
};

/* ------------------------------ module ---------------------------- */

exports.init = function(bot, dispatcher, calc) {
	var wa = new WolframAlpha();

	this.addCommand('calc', function(source, argv, text) {
		if (!argv[0]) {
			source.mention('please tell me what to calculate. beep boop.');
			return;
		}

		source.action('casts The Magic of Asking and ...');

		wa.search(text.replace('calc ', ''), function(result) {
			source.mention(result.data ? 'the answer to your equation is: ' + result.data.replace(/\\'/g, '\'') : 'i don\'t know the answer...');
		});
	});
};