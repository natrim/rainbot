/**
 * Some random quotes
 */

'use strict';

var quotes = [];
var lastQuote = '';

function loadQuotes() {
	quotes = [];
	var fs = require('fs');
	var forEachAsync = require('./../libs/helpers').forEachAsync;
	var qdir = require('path').resolve(__dirname, 'quotes');
	fs.readdir(qdir, function(err, list) {
		if (err) {
			return;
		}
		forEachAsync(list, function(file) {
			var tmp = file.split('.');
			var ext = tmp.pop();
			//var pony = tmp.join('.');
			if (ext === 'json') {
				var data = require(qdir + '/' + file);
				if (typeof data === 'object' && data instanceof Array) {
					quotes = quotes.concat(data);
				}
			}
		});
	});
}

var cheerio = require('cheerio'),
	request = require('request');

function tryWiki(cmd, source) {
	if (cmd === 'archer' || cmd === 'a') {
		cmd = 'Archer_(TV_series)';
	}
	else if (cmd === 'mlp' || cmd === 'pony' || cmd === 'p') {
		cmd = 'My_Little_Pony:_Friendship_is_Magic';
	}
	else if (cmd === 'mash' || cmd === 'm') {
		cmd = 'M*A*S*H_(TV_series)';
	}
	else if (cmd === 'dwarf' || cmd === 'reddwarf' || cmd === 'rd') {
		cmd = 'Red_Dwarf';
	}
	else {
		cmd = cmd.replace(' ', '_');
	}

	function parse(body) {
		var $ = cheerio.load(body, {
			ignoreWhitespace: true
		});

		var quotes = $('dl').toArray();
		var quote = quotes[Math.floor(Math.random() * quotes.length)];
		return $(quote).text().trim();
	}
	request('http://en.wikiquote.org/wiki/' + cmd, function(error, response, body) {
		if (error || response.statusCode !== 200) {
			//try tv serie
			request('http://en.wikiquote.org/wiki/' + cmd + '_(TV_series)', function(error, response, body) {
				if (error || response.statusCode !== 200) {
					source.respond('i did not found any quote!');
					return;
				}

				var dialog = parse(body);
				if (dialog.length > 0) {
					source.respond(dialog);
				}
				else {
					source.respond('i did not found any quote!');
				}
			});

			return;
		}

		var dialog = parse(body);
		if (dialog.length > 0) {
			source.respond(dialog);
		}
		else {
			source.respond('i did not found any quote!');
		}
	});

	return '';
}

function getRandomQuote() {
	return quotes[Math.floor(Math.random() * quotes.length)];
}

function quote(source, args) {
	var serial = '';
	if (typeof args.input !== 'undefined') {
		serial = args[2];
	}
	else {
		serial = args.join(' ');
	}

	if (serial.length > 0) { //get from wikiquote
		tryWiki(serial, source);
		return;
	}

	var q = getRandomQuote();
	if (q === lastQuote) {
		q = getRandomQuote();
	}
	source.respond(q);
	lastQuote = q;
}

function randomChannelQuote(start, irc, min, max, channels) {
	if (!start && irc.connected) {
		var q = getRandomQuote();
		if (q !== '') {
			channels.forEach(function(chan) {
				if (chan.substr(0, 1) === '#') { //TODO: add check to quote only to channels we are in
					setTimeout(function() {
						irc.privMsg(chan, q);
					}, Math.floor(Math.random() * 5000) + 1000);
				}
			});
		}
	}

	return setTimeout(randomChannelQuote.bind(null, false, irc, min, max, channels), Math.floor(Math.random() * max) + min);
}

exports.init = function() {
	if (typeof this.config.autoQuoteIntervalMin !== 'number') {
		this.config.autoQuoteIntervalMin = 3600000;
	}

	if (typeof this.config.autoQuoteIntervalMax !== 'number') {
		this.config.autoQuoteIntervalMax = 14400000;
	}

	if (!(this.config.autoQuoteOnChannel instanceof Array)) {
		if (typeof this.config.autoQuoteOnChannel === 'string') {
			this.config.autoQuoteOnChannel = [this.config.autoQuoteOnChannel];
		}
		else {
			this.config.autoQuoteOnChannel = [];
		}
	}

	process.nextTick(loadQuotes);

	if (this.config.autoQuoteOnChannel.length > 0 && this.config.autoQuoteIntervalMax > 0) {
		this._timer = randomChannelQuote(true, this.require('irc'), this.config.autoQuoteIntervalMin, this.config.autoQuoteIntervalMax, this.config.autoQuoteOnChannel);
	}
	this.addCommand('quote', quote).addCommand('quotes', quote).addCommand('q', quote);
	this.addAction('quote', quote, /^(quotes|quote|q)[ ]?(.*)$/i, false);
};

exports.halt = function() {
	if (this._timer) {
		clearTimeout(this._timer);
		this._timer = null;
	}
	quotes = [];
	lastQuote = '';
};
