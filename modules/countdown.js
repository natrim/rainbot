/**
 * Countdown airing time of tv series
 */

'use strict';

var time = require('time');
var http = require('http');
var formattedDate = require('./../libs/helpers').dateFormat;

//trim some strings
if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

function TvCountDownFactory(what, serial, callback) {
	http.get({
		host: 'tvcountdown.com',
		path: '/s/' + what
	}, function (res) {
		var data = '';
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			if (chunk) {
				data += chunk;
			}
		}).on('end', function () {
			var dnow = new time.Date().getTime();
			var countdowndates = data.match(/var[ ]+timestamp[ ]?=[ ]?\[\'(.*)\'\]\;/);
			var episodenames = data.match(/var[ ]+episode[ ]?=[ ]?\[\'(.*)\'\]\;/);

			if (countdowndates === null) {
				countdowndates = data.match(/timestamp[ ]*\[[0-9]+\][ ]*=[ ]*'([A-Za-z0-9,: ]+)';/g);
				episodenames = data.match(/episode[ ]*\[[0-9]+\][ ]*=[ ]*'([A-Za-z0-9_]+)';/g);

				if (countdowndates !== null) {
					countdowndates = countdowndates.join('');
				}
				if (episodenames !== null) {
					episodenames = episodenames.join('');
				}
			} else {
				countdowndates = countdowndates[0];
				if (episodenames !== null) {
					episodenames = episodenames[0];
				}
			}

			if (countdowndates !== null) {
				var episode = [];
				if (episodenames !== null) {
					episode = require('vm').runInThisContext('var episode = [];' + episodenames + ' episode');
				}

				var timestamp = require('vm').runInThisContext('var timestamp = [];' + countdowndates + ' timestamp');
				var airing, epname = serial,
					eptext = '';
				for (var i = 0; i < timestamp.length; i++) {
					if (!timestamp[i]) {
						continue;
					}
					airing = new time.Date(timestamp[i], 'America/New_York').getTime();
					if (airing > dnow) {
						var name = data.match(/<h2 id="show-title">(.*)<\/h2>/);
						if (name === null) {
							name = data.match(/<h2>(.*)<\/h2>/);
						}
						if (name !== null) {
							epname = name[1].trim();
						}
						if (typeof episode[i] === 'string') {
							eptext = episode[i].split('_').pop().trim();
						}
						callback(null, what, airing, epname, eptext, dnow);
						return;
					}
				}
			}

			callback(new Error('i did not found next episode' + (serial ? ' of \'' + serial + '\'' : '') + '!'), what);
		});
	}).on('error', function () {
		callback(new Error('i got error while counting down!'), what);
	});
}

function MLPCountDownFactory(what, serial, callback) {
	http.get({
		host: 'api.ponycountdown.com',
		path: '/next'
	}, function (res) {
		var data = '';
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			if (chunk) {
				data += chunk;
			}
		}).on('end', function () {
			var dnow = new time.Date().getTime();
			var ep = JSON.parse(data || '{}');
			if (ep) {
				var pt = new time.Date(ep.time, 'UTC').getTime();
				if (pt > dnow) {
					var eptext = 'S' + (ep.season < 10 ? '0' + ep.season : ep.season) + 'E' + (ep.episode < 10 ? '0' + ep.episode : ep.episode) + (ep.name !== '' ? ' (' + ep.name + ')' : '');
					callback(null, what, pt, 'MLP:FiM', eptext, dnow);
					return;
				}
			}

			callback(new Error('no next pony episode found!'), what);
		});
	}).on('error', function () {
		callback(new Error('i got error while counting counting my little ponies!'), what);
	});
}

function Countdown(config) {
	this.config = config;
	this.cache = {};
	this.countdownFactories = {
		'my-little-pony': MLPCountDownFactory,
		'default': TvCountDownFactory
	};
}

Countdown.prototype.formatCountdown = function (airing, serial, episode, now) {
	if (airing === 0) {
		return 'i have no idea when next episode ' + (serial ? 'of \'' + serial + '\' ' : '') + 'airs';
	}

	now = now || new time.Date().getTime();

	var ttnextep = (airing / 1000) - (now / 1000);

	var days = Math.floor(ttnextep / 86400);
	var hours = Math.floor(ttnextep / 3600 - days * 24);
	var minutes = Math.floor(ttnextep / 60 - days * 1440 - hours * 60);
	var seconds = Math.floor(ttnextep - days * 86400 - hours * 3600 - minutes * 60);

	var returnstr = 'next episode ' + (serial ? 'of \'' + serial + (episode ? ' - ' + episode : '') + '\' ' : '') + 'airs in ';
	if (days) {
		returnstr += (days) + ' day' + (days === 1 ? '' : 's') + ', ' + (hours) + ' hour' + (hours === 1 ? '' : 's') + ' and ' + (minutes) + ' minute' + (minutes === 1 ? '' : 's');
	} else if (hours) {
		returnstr += (hours) + ' hour' + (hours === 1 ? '' : 's') + ' and ' + (minutes) + ' minute' + (minutes === 1 ? '' : 's');
	} else if (minutes) {
		returnstr += (minutes) + ' minute' + (minutes === 1 ? '' : 's') + ' and ' + (seconds) + ' second' + (seconds === 1 ? '' : 's');
	} else if (seconds) {
		returnstr += (seconds) + ' second' + (seconds === 1 ? '' : 's');
	} else {
		returnstr += 'less than a second';
	}

	returnstr += ' - ' + (formattedDate(new time.Date(airing), this.config.dateFormat));

	return returnstr;
};

Countdown.prototype.getSerial = function (word) {
	if (typeof word !== 'string') {
		return false;
	}

	var alias = word;
	if (typeof this.config.aliases[word.toLowerCase()] !== 'undefined') {
		alias = this.config.aliases[word.toLowerCase()];
	}

	if (alias instanceof Array) {
		return alias.slice(0); //return clone
	}

	return alias;
};

Countdown.prototype.getSlug = function (word) {
	if (typeof word !== 'string') {
		return false;
	}

	return word.toLowerCase().replace(/[^a-z0-9_]+/g, '-').replace(/^-|-$/g, '');
};

Countdown.prototype.createReplyWithCountdown = function (source, serial) {
	var cd = this;

	if (serial instanceof Array) {
		var broadcast = function () {
			var w = cd.getSerial(serial.pop());

			if (w) {
				cd.createReplyWithCountdown(source, w);
			}

			if (serial.length > 0) {
				setTimeout(broadcast, 1000);
			}
		};

		setTimeout(broadcast, 100);
		return;
	}

	var now = new time.Date().getTime();
	var what = this.getSlug(serial);

	if (!what) {
		source.mention('i failed to get what you wanted...');
		return;
	}

	if (typeof this.cache[what] === 'undefined') {
		this.cache[what] = {
			name: serial,
			episode: '',
			date: 0,
			lastCheck: 0
		};
	}

	if (((now - this.cache[what].lastCheck) > this.config.checkEvery) || ((this.cache[what].date - now) < 0)) { //if itz time for update or time in past
		if (typeof this.countdownFactories[what] !== 'undefined') {
			this.countdownFactories[what](what, this.cache[what].name, this.respond.bind(this, source));
		} else {
			this.countdownFactories['default'](what, this.cache[what].name, this.respond.bind(this, source));
		}
	} else {
		source.mention(this.formatCountdown(this.cache[what].date, this.cache[what].name, this.cache[what].episode, now));
	}
};

Countdown.prototype.respond = function (source, error, what, airing, name, episode, now) {
	now = now || new time.Date().getTime();

	if (error) {
		if((this.cache[what].date - now) > 0) { //use old record
			source.mention(this.formatCountdown(this.cache[what].date, this.cache[what].name, this.cache[what].episode, now));
			return;
		}

		source.mention(typeof error === 'string' ? error : error instanceof Error ? error.message : 'no next episode found!');
		return;
	}

	this.cache[what].date = airing;
	this.cache[what].lastCheck = now;
	if (name && name !== '') {
		this.cache[what].name = name;
	}
	if (episode) {
		this.cache[what].episode = episode;
	} else {
		this.cache[what].episode = '';
	}

	source.mention(this.formatCountdown(this.cache[what].date, this.cache[what].name, this.cache[what].episode, now));
};

Countdown.prototype.command = function (source, args, text, command) {
	var word = null;

	if (args.length > 0) {
		word = this.getSerial(args.join(' '));
	} else if (typeof this.config.aliases[('personalized-' + source.nick).toLowerCase()] !== 'undefined') {
		word = this.getSerial('personalized-' + source.nick);
	} else if (command === 'cd') {
		word = this.getSerial(this.config.defaultSerial);
	} else {
		source.mention('tell me what serial should i count down!');
		return;
	}

	if (word) {
		this.createReplyWithCountdown(source, word);
	} else {
		source.mention('i failed to get what you wanted...');
	}
};

Countdown.prototype.actions = function (source, args) {
	var mode = args[3];
	if (mode === 'alias' || mode === 'default' || mode === 'defaults') {
		if (args[5]) {
			var tmp = args[5].split(' ');
			var nick = tmp.shift();
			var alias = tmp.join(' ');
			if (alias === 'null' || alias === 'false') {
				delete this.config.aliases[((mode === 'default' || mode === 'defaults' ? 'personalized-' : '') + nick).toLowerCase()];
				source.respond(mode === 'default' || mode === 'defaults' ? 'ok, personalized default removed' : 'ok, alias removed');
			} else {
				tmp = alias.match(/^\[(.*)\]$/);

				if (tmp !== null) {
					//no need for this.getSerial as itz array and will be done just in time
					this.config.aliases[((mode === 'default' || mode === 'defaults' ? 'personalized-' : '') + nick).toLowerCase()] = tmp[1].replace(/"|'/g, '').split(',');
				} else {
					this.config.aliases[((mode === 'default' || mode === 'defaults' ? 'personalized-' : '') + nick).toLowerCase()] = this.getSerial(alias);
				}

				source.respond(mode === 'default' || mode === 'defaults' ? 'ok, personalized default changed' : 'ok, alias changed');
			}
		} else {
			source.mention('i have no idea what do u mean with that, give me more...');
		}
	} else {
		source.mention('i don\'t know what to do with that...');
	}
};

exports.init = function () {
	if (typeof this.config.checkEvery !== 'number') {
		this.config.checkEvery = 3600000;
	}

	if (typeof this.config.defaultSerial !== 'string') {
		this.config.defaultSerial = 'My Little Pony';
	}

	if (typeof this.config.dateFormat !== 'string') {
		this.config.dateFormat = 'DD.MM.YYYY HH:II TZ';
	}

	if (typeof this.config.aliases !== 'object') {
		this.config.aliases = {
			'mlp': 'My Little Pony',
			'mlpfim': 'My Little Pony',
			'mlp:fim': 'My Little Pony',
			'My Little Pony: Friendship is Magic': 'My Little Pony'
		};
	}

	this.countdown = new Countdown(this.config);

	this.addCommand('cd', this.countdown.command.bind(this.countdown));
	this.addCommand('tv', this.countdown.command.bind(this.countdown));

	this.addAction('countdown', this.countdown.actions.bind(this.countdown), /^countdown(([ ]+(\w+)([ ]+(.*)|))*)/, ['owner', 'operators']);
};

exports.halt = function () {
	this.countdown.cache = {};
};
