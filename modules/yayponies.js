/**
 * Yayponies.eu torrent magnet finder
 */

'use strict';

var cheerio = require('cheerio'),
	request = require('request');

var yayPoniesMirror = 'http://main.yayponies.eu/episodes/';
var scanFeeds = [
	['1it.rss', '1080p'], //itunes 1080p raw
	['7it.rss', '720p'], //itunes 720p raw
	['1zt.rss', 'cc1080p'], //cc1080p
	['7zt.rss', 'cc720p'], //cc720p
	['1tt.rss', 'hdtv1080p'], //1080ptvrip
	['7lt.rss', 'sd'], //lowquality
	['7lzt.rss', 'ccsd'] //lowquality cc
];

var formats = [];
scanFeeds.forEach(function(page) {
	formats.push(page[1]);
});

var episodes = [];

function scanFeed(page, callback) {
	request(yayPoniesMirror + page[0], function(error, response, body) {
		if (error || response.statusCode !== 200) {
			callback();
			return;
		}

		var type = page[1];

		var $ = cheerio.load(body, {
			ignoreWhitespace: true,
			xmlMode: true
		});

		$('item').each(function() {
			var item = $(this);
			var match = item.find('description').text().match(/Episode Title: ([^;]+); Season: ([^;]+); Episode: (.*)/i);
			if (match) {
				var season = parseInt(match[2], 10);
				var episode = parseInt(match[3], 10);
				var magnet = item.find('magnetURI').text();
				if (typeof episodes[season - 1] === 'undefined') { //make season space
					episodes[season - 1] = [];
				}
				if (typeof episodes[season - 1][episode - 1] === 'undefined') {
					episodes[season - 1][episode - 1] = {
						season: season,
						episode: episode,
						name: match[1],
						available: []
					};
				}
				episodes[season - 1][episode - 1].available.push(type);
				episodes[season - 1][episode - 1][type] = magnet;
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
	var scanCount = scanFeeds.length;
	scanFeeds.forEach(function(page, i) {
		setTimeout(function() {
			scanFeed(page, function() {
				scanCount--;
				if (scanCount <= 0 && source) {
					var count = countEpisodes();
					source.respond('DB reloaded with ' + count[0] + ' seasons and ' + count[1] + ' episodes !');
				}
			});
		}, 100 + (20 * i));
	});
}

function getFormats(search) {
	if (typeof search !== 'undefined') {
		search = search.toLowerCase();
		return formats.filter(function(val) {
			return val.search(search) !== -1;
		});
	}
	else {
		return [formats[0]];
	}
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

		var foundFormats = getFormats(arg[1]);

		if (!(typeof foundFormats === 'object' && foundFormats instanceof Array) || foundFormats.length <= 0) {
			source.mention('wrong format! you can use: ' + formats.join(', '));
			return;
		}

		var found = 0;
		foundFormats.forEach(function(format) {
			if ((episode = episodes[ep[1] - 1]) && (episode = episode[ep[2] - 1])) {
				if (episode[format] && episode[format]) {
					found = 1;
					source.mention('episode S' + (episode.season < 10 ? '0' + episode.season : episode.season) + 'E' + (episode.episode < 10 ? '0' + episode.episode : episode.episode) + (episode.name ? ' (' + episode.name + ')' : '') + ' in format ' + format + ' - ' + episode[format]);
				}
				else if (found === 0) {
					found = 2;
				}
			}
		});
		if (found === 2) {
			if ((episode = episodes[ep[1] - 1]) && (episode = episode[ep[2] - 1])) {
				source.mention('episode S' + (ep[1] < 10 ? '0' + ep[1] : ep[1]) + 'E' + (ep[2] < 10 ? '0' + ep[2] : ep[2]) + ' in this format is not available, try different format (' + episode.available.join(', ') + ')');
			}
		}
		else if (found === 0) {
			source.mention('i can\'t find ' + 'episode S' + (ep[1] < 10 ? '0' + ep[1] : ep[1]) + 'E' + (ep[2] < 10 ? '0' + ep[2] : ep[2]));
		}
	}
	else {
		source.mention('to get magnet ponies from \'yayponies.eu\' specify episode using \'s??e??\', \'??x??\' or \'??e??\'! Use \'last\' to get last episode. And optional format: ' + formats.join(', '));
	}
}

exports.init = function() {
	this.addCommand('ponies', getPonies);
	this.addCommand('pony', getPonies);
	this.addCommand('yayponies', getPonies);

	this.addAction('refresh', refreshEpisodes, /^refresh$/, ['owner', 'operators']);

	//first load eps
	setImmediate(function() {
		refreshEpisodes(false);
	});
	//then refresh every day
	this._refresh = setInterval(function() {
		refreshEpisodes(false);
	}, 86400000);
};

exports.halt = function() {
	if (this._refresh) {
		clearInterval(this._refresh);
		this._refresh = null;
	}
	episodes = [];
};
