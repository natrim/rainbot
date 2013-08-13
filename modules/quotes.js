/**
 * Some random quotes
 */

'use strict';

var quotes;
var lastQuote = '';

function loadQuotes() {
	quotes = [];
	var fs = require('fs');
	var forEachAsync = require(LIBS_DIR + '/helpers').forEachAsync;
	fs.readdir(MODULES_DIR + '/quotes', function (err, list) {
		if (err) {
			return;
		}
		forEachAsync(list, function (file) {
			var ext = file.split('.').pop();
			if (ext === 'json') {
				var data = require(MODULES_DIR + '/quotes/' + file);
				if (typeof data === 'object' && data instanceof Array) {
					quotes = quotes.concat(data);
				}
			}
		});
	});
}

function getRandomQuote() {
	if (!(quotes instanceof Array) || quotes.length <= 0) {
		return 'Quotes have been not loaded!';
	}
	return quotes[Math.floor(Math.random() * quotes.length)];
}

function quote(source) {
	var q = getRandomQuote();
	if (q === lastQuote) {
		q = getRandomQuote();
	}
	source.respond(q);
	lastQuote = q;
}

exports.init = function () {

	loadQuotes();

	this.addCommand('quote', quote).addCommand('quotes', quote).addCommand('q', quote);
	this.addAction('quote', quote, /^(quotes|quote|q)$/i, false);
};