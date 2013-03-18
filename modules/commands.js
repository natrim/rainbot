module.exports.init = function() {
	'use strict';

	var c = this.require('controls');
	var irc = this.require('irc');

	c.addAction('quit', function(source, args) {
		source.respond('ok, ' + source.nick + '! goodbye everypony!');
		args.shift();
		irc.quit(args.join(' '));
	}, /^quit[ ]?(.*)$/i);

	c.addAction('part', function(source, args) {
		var chans = args[1].match(/#[\w]+/gi);
		if (chans !== null) {
			source.respond('ok, ' + source.nick + '!');
			irc.part.apply(irc, chans);
		} else if (source.channel) {
			source.respond('ok, ' + source.nick + '!');
			irc.part(source.channel);
		} else {
			source.mention('please specify a channel.');
		}
	}, /^part([ ]+(.*)|)$/i);

	c.addAction('join', function(source, args) {
		var chans = args[1].match(/#[\w]+/gi);
		if (chans !== null) {
			source.respond('ok, ' + source.nick + '!');
			irc.join.apply(irc, chans);
		} else {
			source.mention('please specify a channel.');
		}
	}, /^join([ ]+(.*)|)$/i);

	c.addAction('nick', function(source, args) {
		var nick = args[2];
		if (nick) {
			source.respond('ok, ' + source.nick + ', lemmy try this new name');
			irc.nick(nick);
		} else {
			source.mention('im pretty sure you know my name already, but here it is, only for u: Hello, my name is ' + irc.currentNick);
		}
	}, /^nick([ ]+(.*)|)$/i);

	function help(source) {
		//TODO: display only commands the asking user has persmission to
		source.mention('available commands are: ' + c.commandDelimiter + Object.keys(c.commands).join(', ' + c.commandDelimiter));
		//TODO: display only actions the asking user has persmission to and send them in PRIVMSG
		//source.respond('available actions are: ' + Object.keys(c.actions).join(', '));
	}

	c.addCommand('help', help).addAction('help', help, /^help$/);

	var mm = this.mm;

	c.addAction('lsmod', function(source) {
		source.mention('i have these modules active: ' + mm.getModules().join(', '));
	}, /^lsmod|modules$/);

	c.addAction('reload', function(source, args) {
		var modules = args[1].match(/\w+/gi);
		var call = function(err, m) {
			if (err) {
				source.respond('module \'' + m + '\' failed to reload! ' + err);
			} else {
				source.respond('module \'' + m + '\' reloaded!');
			}
		};
		source.mention('ok');
		modules.forEach(function(name) {
			mm.reload(name, call);
		});
	}, /^reload[ ]+(.*)$/);

	c.addAction('load', function(source, args) {
		var modules = args[1].match(/\w+/gi);
		var call = function(err, m) {
			if (err) {
				source.respond('module \'' + m + '\' failed to load! ' + err);
			} else {
				source.respond('module \'' + m + '\' loaded!');
			}
		};
		source.mention('ok');
		modules.forEach(function(name) {
			mm.load(name, call);
		});
	}, /^load[ ]+(.*)$/);

	c.addAction('unload', function(source, args) {
		var modules = args[1].match(/\w+/gi);
		var call = function(err, m) {
			if (err) {
				source.respond('module \'' + m + '\' failed to unload! ' + err);
			} else {
				source.respond('module \'' + m + '\' unloaded!');
			}
		};
		source.mention('ok');
		modules.forEach(function(name) {
			mm.unload(name, call);
		});
	}, /^unload[ ]+(.*)$/);
};

module.exports.halt = function() {
	var c = this.require('controls');

	c.removeAction('quit').removeAction('part').removeAction('join').removeAction('nick');
	c.removeAction('help').removeCommand('help');
	c.removeAction('lsmod').removeAction('load').removeAction('unload').removeAction('reload');
};