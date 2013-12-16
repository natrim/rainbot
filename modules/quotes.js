/**
 * Some random quotes
 */

'use strict';

var quotes;
var ponydex = {};
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
			var tmp = file.split('.');
			var ext = tmp.pop();
			var pony = tmp.join('.');
			if (ext === 'json') {
				var data = require(MODULES_DIR + '/quotes/' + file);
				if (typeof data === 'object' && data instanceof Array) {
					quotes = quotes.concat(data);
					ponydex[pony] = quotes.slice(quotes.length - data.length, quotes.length);
				}
			}
		});
	});
}

function slug(word) {
	if (typeof word !== 'string') {
		return false;
	}

	return word.toLowerCase().replace(/[^a-z0-9_]+/g, '');
}

function getRandomQuote(pony) {
	pony = slug(pony) || null;
	if (!(quotes instanceof Array) || quotes.length <= 0) {
		return 'Quotes have been not loaded!';
	}

	if (pony && typeof ponydex[pony] !== 'undefined') {
		return ponydex[pony][Math.floor(Math.random() * ponydex[pony].length)];
	}

	return quotes[Math.floor(Math.random() * quotes.length)];
}

function quote(source, args) {
	var pony = null;
	if (typeof args.input !== 'undefined') {
		pony = args[2];
	} else {
		pony = args.join(' ');
	}

	var q = getRandomQuote(pony);
	if (q === lastQuote) {
		q = getRandomQuote();
	}
	source.respond(q);
	lastQuote = q;
}

exports.init = function () {

	loadQuotes();

	this.addCommand('quote', quote).addCommand('quotes', quote).addCommand('q', quote);
	this.addAction('quote', quote, /^(quotes|quote|q)[ ]?(.*)$/i, false);
};