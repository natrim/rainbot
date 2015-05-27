/**
 * Some random quotes
 */

'use strict';

var quotes = [];
var ponydex = {};
var lastQuote = '';

function loadQuotes() {
	quotes = [];
	var fs = require('fs');
	var forEachAsync = require('./../libs/helpers').forEachAsync;
	var qdir = require('path').resolve(__dirname, 'quotes');
	fs.readdir(qdir, function (err, list) {
		if (err) {
			return;
		}
		forEachAsync(list, function (file) {
			var tmp = file.split('.');
			var ext = tmp.pop();
			var pony = tmp.join('.');
			if (ext === 'json') {
				var data = require(qdir + '/' + file);
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
	if (pony === '') { //random pony quote by def
		return quotes[Math.floor(Math.random() * quotes.length)];
	}
	pony = slug(pony) || null;
	if (!(quotes instanceof Array) || quotes.length <= 0) {
		return '';
	}

	if (pony && typeof ponydex[pony] !== 'undefined') {
		return ponydex[pony][Math.floor(Math.random() * ponydex[pony].length)];
	}
	
	return '';
}

var cheerio = require('cheerio'),
	request = require('request');

function tryWiki(cmd, source) {
	if(cmd === 'archer' || cmd === 'a') {
		cmd = 'Archer_(TV_series)';
	} else if (cmd === 'mlp' || cmd === 'pony' || cmd === 'p') {
		cmd = 'My_Little_Pony:_Friendship_is_Magic';
	} else if (cmd === 'mash' || cmd === 'm') {
		cmd = 'M*A*S*H_(TV_series)';
	} else {
		cmd = cmd.replace(' ', '_');
	}
	request('http://en.wikiquote.org/wiki/' + cmd, function(error, response, body) {
		if (error || response.statusCode !== 200) {
			source.respond('i did not found any quote!');
			return;
		}

		var $ = cheerio.load(body, {
			ignoreWhitespace: true
		});
		
		var quotes = $('dl').toArray();
		var quote = quotes[Math.floor(Math.random() * quotes.length)];
		var dialog = $(quote).text().trim();
		if (dialog.length > 0) {
			source.respond(dialog);
		} else {
			source.respond('i did not found any quote!');
		}
	});
    
    return '';
}

function quote(source, args) {
	var pony = '';
	if (typeof args.input !== 'undefined') {
		pony = args[2];
	} else {
		pony = args.join(' ');
	}

	var q = getRandomQuote(pony);
	if (q === '') {
		tryWiki(pony, source);
		return;
	} else if (q === lastQuote) {
		q = getRandomQuote(pony);
	}
	source.respond(q);
	lastQuote = q;
}

function randomChannelQuote(start, irc, min, max, channels) {
	if (!start && irc.connected) {
		var q = getRandomQuote();
		if (q !== '') {
			channels.forEach(function (chan) {
				if (chan.substr(0, 1) === '#') { //TODO: add check to quote only to channels we are in
					setTimeout(function () {
						irc.privMsg(chan, q);
					}, Math.floor(Math.random() * 5000) + 1000);
				}
			});
		}
	}

	return setTimeout(randomChannelQuote.bind(null, false, irc, min, max, channels), Math.floor(Math.random() * max) + min);
}

exports.init = function () {
	if (typeof this.config.autoQuoteIntervalMin !== 'number') {
		this.config.autoQuoteIntervalMin = 3600000;
	}

	if (typeof this.config.autoQuoteIntervalMax !== 'number') {
		this.config.autoQuoteIntervalMax = 14400000;
	}

	if (!(this.config.autoQuoteOnChannel instanceof Array)) {
		if (typeof this.config.autoQuoteOnChannel === 'string') {
			this.config.autoQuoteOnChannel = [this.config.autoQuoteOnChannel];
		} else {
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

exports.halt = function () {
	if (this._timer) {
		clearTimeout(this._timer);
		this._timer = null;
	}
	ponydex = {};
	quotes = [];
	lastQuote = '';
};
