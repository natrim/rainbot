/**
 * Yayponies.eu torrent magnet finder
 */

/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

var cheerio = require('cheerio'),
	request = require('request');

var formats = {
	'cc1080p': 'cc1080p',
	'cc1080': 'cc1080p',
	'cc720p': 'cc720p',
	'cc720': 'cc720p',
	'cc': 'cc720p',
	'itunes1080p': 'itunes1080p',
	'itunes1080': 'itunes1080p',
	'1080': 'itunes1080p',
	'1080p': 'itunes1080p',
	'itunes720p': 'itunes720p',
	'itunes720': 'itunes720p',
	'720': 'itunes720p',
	'720p': 'itunes720p',
	'hdtv1080p': 'hdtv1080p',
	'hdtv1080': 'hdtv1080p',
	'hdtv': 'hdtv1080p',
	'sd': 'sd',
	'yp': 'yp720p',
	'yp720': 'yp720p',
	'yp720p': 'yp720p',
	'yp1080': 'yp1080p',
	'yp1080p': 'yp1080p',

	'itunes720au': 'itunes720au',
	'itunes720pau': 'itunes720au',
	'720pau': 'itunes720au',
	'720au': 'itunes720au',
	'itunes1080au': 'itunes1080au',
	'itunes1080pau': 'itunes1080au',
	'1080pau': 'itunes1080au',
	'1080au': 'itunes1080au',
	'au': 'itunes1080au',

	'itunes': 'itunes1080p'
};

var yayPoniesMirror = 'http://main.yayponies.eu/';
var scanPages = [
	['7it1.php', 1], //720 raw
	['7it2.php', 2], //720 raw
	['7it3.php', 3], //720 raw
	['7at1.php', 1], //720 AU raw
	['7at2.php', 2], //720 AU raw
	['7at3.php', 3], //720 AU raw
	['1it1.php', 1], //1080 raw
	['1it2.php', 2], //1080 raw
	['1it3.php', 3], //1080 raw
	['1at1.php', 1], //1080 AU raw
	['1at2.php', 2], //1080 AU raw
	['1at3.php', 3], //1080 AU raw
	['7zt1.php', 1], //720 cc
	['7zt2.php', 2], //720 cc
	['7zt3.php', 3], //720 cc
	['1zt1.php', 1], //1080 cc
	['1zt2.php', 2], //1080 cc
	['1zt3.php', 3], //1080 cc
	['4st1.php', 1], //SD
	['4st2.php', 2], //SD
	['4st3.php', 3], //SD
	['1st1.php', 1], //1080 hdtv
	['1st2.php', 2], //1080 hdtv
	['1st3.php', 3] //1080 hdtv
	];

var episodes = [];

function scanPage(page, season, callback) {
	if (typeof episodes[season - 1] === 'undefined') {
		episodes[season - 1] = [];
	}

	request(yayPoniesMirror + page, function(error, response, body) {
		if (error || response.statusCode !== 200) {
			callback();
			return;
		}

		var $ = cheerio.load(body);

		var table = $('#container table');
		if (table.length > 1) {
			table = $(table[0]);
		}

		table.find('tr').each(function() {
			var text = $(this).text();
			var episode = 0;
			var type = '';

			var match = text.match(/Episode[ ]+(\d+)[ ]*\((.+?)\)/i);
			if (match) {
				episode = parseInt(match[1], 10);

				if (text.match(/720p.*AU.*Raw/i)) {
					type = 'itunes720au';
				} else if (text.match(/1080p.*AU.*Raw/i)) {
					type = 'itunes1080au';
				} else if (text.match(/720p.*Raw/i) || text.match(/720p.*TEMP/i)) {
					type = 'itunes720p';
				} else if (text.match(/720p.*CC/i) || text.match(/Corrected.*720P/i) || text.match(/720p.*corrected/i)) {
					type = 'cc720p';
				} else if (text.match(/720p.*(Uncensored|Edited|YP)/i)) {
					type = 'yp720p';
				} else if (text.match(/1080p.*(Uncensored|Edited|YP)/i)) {
					type = 'yp1080p';
				} else if (text.match(/1080p.*CC/i) || text.match(/Corrected.*1080P/i) || text.match(/1080p.*corrected/i)) {
					type = 'cc1080p';
				} else if (text.match(/1R/i) || text.match(/1080p.*(iTunes|Raw)/i)) {
					type = 'itunes1080p';
				} else if (text.match(/SD/i)) {
					type = 'sd';
				} else if (text.match(/1080p/i) || text.match(/TV\-Rips/i)) {
					type = 'hdtv1080p';
				}

				if (episode && type) {
					$(this).find('a[href*=magnet]').each(function() {
						var magnet = $(this).attr('href').match(/magnet:\?xt=urn:btih:(.*)/);
						if (magnet && $(this).text()) {
							if (typeof episodes[season - 1][episode - 1] === 'undefined') {
								episodes[season - 1][episode - 1] = {
									season: season,
									episode: episode,
									name: match[2]
								};
							}
							if (typeof episodes[season - 1][episode - 1][type] === 'undefined') {
								episodes[season - 1][episode - 1][type] = {};
							}
							episodes[season - 1][episode - 1][type].btih = magnet[1];
						}
					});
				}
			}
		});

		callback();
	});
}

function countEpisodes() {
	var eps = 0;
	for (var i = 0; i < episodes.length; i++) {
		for (var k = 0; k < episodes[i].length; k++) {
			eps++;
		}
	}

	return [episodes.length, eps];
}

function refreshEpisodes(source) {
	var scanCount = scanPages.length;
	scanPages.forEach(function(page, i) {
		setTimeout(function() {
			scanPage(page[0], page[1], function() {
				scanCount--;
				if (scanCount <= 0 && source) {
					var count = countEpisodes();
					source.respond('DB reloaded with ' + count[0] + ' seasons and ' + count[1] + ' episodes !');
				}
			});
		}, 100 + (20 * i));
	});
}

function getPonies(source, arg) {
	var episode;

	if (arg[0] && arg[0] !== 'help') {
		if (/(count|how|number|episode|stat|release)( )?(s|many)?/i.test(arg[0])) {
			var count = countEpisodes();
			var reply = 'i have many ponies in ' + count[0] + ' seasons and ' + count[1] + ' episodes';

			if (episodes[episodes.length - 1]) {
				episode = episodes[episodes.length - 1][episodes[episodes.length - 1].length - 1];
				reply += '. Last parsed episode is: ' + 'S' + (episode.season < 10 ? '0' + episode.season : episode.season) + 'E' + (episode.episode < 10 ? '0' + episode.episode : episode.episode) + (episode.name ? ' (' + episode.name + ')' : '');
			}

			source.mention(reply);

			return;
		}

		if (arg[0] === 'last' && episodes[episodes.length - 1]) {
			arg[0] = 'S' + episodes.length + 'E' + episodes[episodes.length - 1].length;
		}

		var ep = arg[0].match(/s?(\d+)[xe]+(\d+)/i);
		if (ep === null) {
			source.mention('specify episode using \'s??e??\' or \'??x??\' or \'??e??\'!');
			return;
		}

		//make int
		ep[1] = parseInt(ep[1], 10);
		ep[2] = parseInt(ep[2], 10);

		var format = formats[typeof arg[2] !== 'undefined' ? arg[1].toLowerCase() : 'itunes1080p'];

		if (!format) {
			source.mention('wrong format! you can use: cc1080p, itunes1080p, itunes1080au, hdtv1080p, cc720p, itunes720p, itunes720au, sd');
			return;
		}

		if ((episode = episodes[ep[1] - 1]) && (episode = episode[ep[2] - 1]) && episode[format] && episode[format].btih) {
			//try derpy first
			if (typeof arg[2] === 'undefined' || arg[2].substr(0, 2) !== 'no') {
				if (format === 'itunes720p' && episode.yp720p && episode.yp720p.btih) {
					format = 'yp720p';
				} else if (format === 'itunes1080p' && episode.yp1080p && episode.yp1080p.btih) {
					format = 'yp1080p';
				}
			}

			source.mention('episode S' + (episode.season < 10 ? '0' + episode.season : episode.season) + 'E' + (episode.episode < 10 ? '0' + episode.episode : episode.episode) + (episode.name ? ' (' + episode.name + ')' : '') + ' in format ' + format + ' - magnet:?xt=urn:btih:' + episode[format].btih);
		} else {
			if ((episode = episodes[ep[1] - 1]) && (episode = episode[ep[2] - 1])) {
				source.mention('episode S' + (ep[1] < 10 ? '0' + ep[1] : ep[1]) + 'E' + (ep[2] < 10 ? '0' + ep[2] : ep[2]) + ' in format ' + format + ' is not available, try different format (cc1080p, itunes1080p, itunes1080au, hdtv1080p, cc720p, itunes720p, itunes720au, sd)');
			} else {
				source.mention('i can\'t find magnet for ' + 'episode S' + (ep[1] < 10 ? '0' + ep[1] : ep[1]) + 'E' + (ep[2] < 10 ? '0' + ep[2] : ep[2]));
			}
		}
	} else {
		source.mention('to get magnet ponies from \'yayponies.eu\' specify episode using \'s??e??\', \'??x??\' or \'??e??\'! Use \'last\' to get last episode. And optional format: cc1080p, itunes1080p, itunes1080au, hdtv1080p, cc720p, itunes720p, itunes720au, sd');
	}
}

exports.init = function(reload) {
	this.addCommand('ponies', getPonies);
	this.addCommand('pony', getPonies);
	this.addCommand('yayponies', getPonies);

	this.addAction('refresh', refreshEpisodes, /^refresh$/, ['owner', 'operators']);

	//first load eps
	process.nextTick(function() {
		refreshEpisodes(false);
	});
	//then refresh every day
	this._refresh = setInterval(function() {
		refreshEpisodes(false);
	}, 86400000);
};

exports.halt = function() {
	clearInterval(this._refresh);
};