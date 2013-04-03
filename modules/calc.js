/**
 * Simple WA calc
 */

/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */

/* ------------------------------ Includes && Options ----------------- */
var exec = require('child_process').exec;

/* ------------------------------ WolframAlpha ------------------------ */

function WolframAlpha() {
	this.search = function(query, hollaback) {
		var result = {
			url: 'http://www.wolframalpha.com/input/?i=' + encodeURIComponent(query)
		};

		exec('curl -e \'http://www.wolframalpha.com\' \'' + result.url + '\'', function(err, stdout, stderr) {
			var solution = />Solution:<[\s\S]*?alt\s*=\s*\"([^\""]*)\"/,
				other = /stringified"\s*:\s*"([^"\r\n]*)/g;

			if (solution.test(stdout)) {
				result.data = stdout.match(solution)[1].replace(/\\\//, '/');
			} else {
				var match = stdout.match(other);
				if (!match || !match[1]) {
					result.data = null;
				} else {
					result.data = match[1].replace(/stringified"\s*:\s*"/g, '').replace(/\\n/g, ' ').replace(/\\\//, '/');
				}
			}

			hollaback.call(this, result);
		});
	};
}

exports.init = function(bot, dispatcher, calc) {
	var wa = new WolframAlpha();

	this.require('controls').addCommand('calc', function(source, argv) {
		if (!argv[0]) {
			source.mention('please tell me what to calculate. beep boop.');
			return;
		}

		source.action('casts the magic of math and ...');

		wa.search(argv.join(' '), function(result) {
			source.mention(result.data ? 'the answer is: ' + result.data.replace(/\\'/g, '\'') : 'i don\'t know the answer :(');
		});
	});
};

exports.halt = function(bot) {
	this.require('controls').removeCommand('calc');
};