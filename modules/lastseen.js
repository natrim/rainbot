'use strict';

var time = require('time'), logger = require(LIBS_DIR + '/logger');

//main data storage
var lastSeenHashStorage = {};

/**
 Calculates the difference between two unix times and returns
 a string like '15d 23h 42m 15s ago'
 */
function calcDiff(when) {
	var now = (new time.Date().getTime() / 1000);
	var diff = (now - when);

	if (diff < 1) {
		return 'just now';
	}

	var day = Math.floor(diff / 86400);
	diff -= (day * 86400);
	var hrs = Math.floor(diff / 3600);
	diff -= (hrs * 3600);
	var min = Math.floor(diff / 60);
	diff -= (min * 60);
	var sec = Math.floor(diff);

	return (day > 0 ? day + 'd ' : '') + (hrs > 0 ? hrs + 'h ' : '') + (min > 0 ? min + 'm ' : '') + sec + 's ' + 'ago';
}

//hook for nick changes
function onNick(source, args) {
	if (args[0]) {
		lastSeenHashStorage[source.nick.toLowerCase()] = {
			'last': (new time.Date().getTime() / 1000),
			'words': '"' + source.nick + '" changed nick to "' + args[0] + '"'
		};
		lastSeenHashStorage[args[0].toLowerCase()] = {
			'last': (new time.Date().getTime() / 1000),
			'words': '"' + args[0] + '" changed nick from "' + source.nick + '"'
		};
	}
}

//hook for people quitting
function onQuit(source, args) {
	if (args[0]) {
		lastSeenHashStorage[source.nick.toLowerCase()] = {
			'last': (new time.Date().getTime() / 1000),
			'words': '"' + source.nick + '" quit IRC stating "' + args[0] + '"'
		};
	} else {
		lastSeenHashStorage[source.nick.toLowerCase()] = {
			'last': (new time.Date().getTime() / 1000),
			'words': '"' + source.nick + '" quit IRC with no reason'
		};
	}
}

//hook for people joining
function onJoin(source, args) {
	if (args[0]) {
		lastSeenHashStorage[source.nick.toLowerCase()] = {
			'last': (new time.Date().getTime() / 1000),
			'words': '"' + source.nick + '" joined channel "' + args[0] + '"'
		};
	} else {
		lastSeenHashStorage[source.nick.toLowerCase()] = {
			'last': (new time.Date().getTime() / 1000),
			'words': '"' + source.nick + '" joined'
		};
	}
}

//hook for people parting
function onPart(source, args) {
	if (args[0]) {
		if (args[1]) {
			lastSeenHashStorage[source.nick.toLowerCase()] = {
				'last': (new time.Date().getTime() / 1000),
				'words': '"' + source.nick + '" left channel "' + args[0] + '" stating "' + args[1] + '"'
			};
		} else {
			lastSeenHashStorage[source.nick.toLowerCase()] = {
				'last': (new time.Date().getTime() / 1000),
				'words': '"' + source.nick + '" left channel "' + args[0] + '"'
			};
		}
	} else {
		lastSeenHashStorage[source.nick.toLowerCase()] = {
			'last': (new time.Date().getTime() / 1000),
			'words': '"' + source.nick + '" left'
		};
	}
}

//hook for speaking
function onMessage(source, text) {
	lastSeenHashStorage[source.nick.toLowerCase()] = {
		'last': (new time.Date().getTime() / 1000),
		'words': '"' + source.nick + '" last said "' + text + '" on "' + source.channel + '"'
	};
}

function replyWithResult(source, args) {
	if (!args[0]) {
		source.mention('you need to specify <nick>');
		return;
	}
	var wantedNick = args[0].toLowerCase();
	if (wantedNick === source.nick.toLowerCase()) {
		source.mention('i see u right now...');
	} else if (wantedNick === source.irc.currentNick) {
		source.mention('are you talking about me?');
	} else if (typeof lastSeenHashStorage[wantedNick] !== 'undefined') {
		source.reply(lastSeenHashStorage[wantedNick].words + ' ' + calcDiff(lastSeenHashStorage[wantedNick].last) + '.');
	} else {
		source.mention('i don\'t know anything about "' + args[0] + '"');
	}
}

exports.init = function () {
	try {
		lastSeenHashStorage = JSON.parse(require('fs').readFileSync(MODULES_DIR + '/lastseen/hash.json'));
	} catch (e) {
		logger.warn('Lastseen file load failed, using empty file.');
		lastSeenHashStorage = {};
	}
	if (typeof lastSeenHashStorage !== 'object') {
		lastSeenHashStorage = {};
	}
	this.addCommand('lastseen', replyWithResult).addCommand('seen', replyWithResult);
	this.dispatcher.on('irc/QUIT', onQuit).on('irc/PART', onPart).on('irc/JOIN', onJoin).on('irc/NICK', onNick).on('irc/PRIVMSG', onMessage).on('irc/NOTICE', onMessage);
};

exports.halt = function () {
	try {
		require('fs').writeFileSync(MODULES_DIR + '/lastseen/hash.json', JSON.stringify(lastSeenHashStorage, null, 4));
	} catch (e) {
		logger.warn('Lastseen file save failed, i\'m now forgetting all the bronies i saw.');
	}
};
