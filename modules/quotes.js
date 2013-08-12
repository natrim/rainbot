/**
 * Some random quotes
 */

'use strict';

var quotes;

function loadQuotes() {
	quotes = [];
	require('fs').readdir(MODULES_DIR + '/quotes', function (err, list) {
		if (err) {
			return;
		}
		list.forEach(function (file) {
			if (file.substr(-4) === 'json') {
				quotes = quotes.concat(require(MODULES_DIR + '/quotes/' + file));
			}
		});
	});
}

function quote(source) {
	source.respond(quotes[Math.floor(Math.random() * quotes.length)]);
}

exports.init = function () {

	loadQuotes();

	this.addCommand('quote', quote).addCommand('quotes', quote).addCommand('q', quote);
	this.addAction('quote', quote, /^(quotes|quote|q)$/i, false);
};