/**
 * Some random quotes
 */

'use strict';

var quotes;
var lastQuote = '';

function loadQuotes() {
	quotes = [];
	var fs = require('fs');
	fs.readdir(MODULES_DIR + '/quotes', function (err, list) {
		if (err) {
			return;
		}
		list.forEach(function (file) {
			var ext = file.split('.').pop();
			if (ext === 'json') {
				quotes = quotes.concat(require(MODULES_DIR + '/quotes/' + file));
			} else if (!isNaN(parseInt(ext, 10))) {
				fs.readFile(MODULES_DIR + '/quotes/' + file, {
					encoding: 'UTF8'
				}, function (err, data) {
					if (err) {
						return;
					}
					quotes.push(data.replace(/\r?\n|\r/g, ' '));
				});
			}
		});

		quotes = require(LIBS_DIR + '/helpers').unique(quotes);
	});
}

function getRandomQuote() {
	if (quotes.length <= 0) {
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