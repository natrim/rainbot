'use strict';

var time = require('time');

//main data storage
var lasthash = {};

/**
 Calculates the difference between two unix times and returns
 a string like '15d 23h 42m 15s ago'
*/
function calcDiff(when) {
	var now = new time.Date().getTime();
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
		lasthash[source.nick] = {
			'last': new time.Date().getTime(),
			'words': '"' + source.nick + '" changed nick to "' + args[0] + '"'
		};
		lasthash[source.nick] = {
			'last': new time.Date().getTime(),
			'words': '"' + args[0] + '" changed nick from "' + source.nick + '"'
		};
	}
}

//hook for people quitting
function onQuit(source, args) {
	if (args[0]) {
		lasthash[source.nick] = {
			'last': new time.Date().getTime(),
			'words': '"' + source.nick + '" quit IRC stating "' + args[0] + '"'
		};
	} else {
		lasthash[source.nick] = {
			'last': new time.Date().getTime(),
			'words': '"' + source.nick + '" quit IRC with no reason'
		};
	}
}

//hook for people joining
function onJoin(source, args) {
	if (args[0]) {
		lasthash[source.nick] = {
			'last': new time.Date().getTime(),
			'words': '"' + source.nick + '" joined channel "' + args[0] + '"'
		};
	} else {
		lasthash[source.nick] = {
			'last': new time.Date().getTime(),
			'words': '"' + source.nick + '" joined'
		};
	}
}

//hook for people parting
function onPart(source, args) {
	if (args[0]) {
		if (args[1]) {
			lasthash[source.nick] = {
				'last': new time.Date().getTime(),
				'words': '"' + source.nick + '" left channel "' + args[0] + '" stating "' + args[1] + '"'
			};
		} else {
			lasthash[source.nick] = {
				'last': new time.Date().getTime(),
				'words': '"' + source.nick + '" left channel "' + args[0] + '"'
			};
		}
	} else {
		lasthash[source.nick] = {
			'last': new time.Date().getTime(),
			'words': '"' + source.nick + '" left'
		};
	}
}

//hook for speaking
function onMessage(source, text) {
	lasthash[source.nick] = {
		'last': new time.Date().getTime(),
		'words': '"' + source.nick + '" last said "' + text + '" on "' + source.channel + '"'
	};
}

function replyWithResult(source, args) {
	if (!args[0]) {
		source.mention('you need to specify <nick>');
		return;
	}
	if (typeof lasthash[args[0]] !== 'undefined') {
		source.reply(lasthash[args[0]].words + ' ' + calcDiff(lasthash[args[0]].last) + '.');
	} else {
		source.mention('i don\'t know anything about "' + args[0] + '"');
	}
}

exports.init = function () {
	this.addCommand('lastseen', replyWithResult).addCommand('seen', replyWithResult).addCommand('last', replyWithResult);
	this.dispatcher.on('irc/QUIT', onQuit).on('irc/PART', onPart).on('irc/JOIN', onJoin).on('irc/NICK', onNick).on('irc/PRIVMSG', onMessage).on('irc/NOTICE', onMessage);
};