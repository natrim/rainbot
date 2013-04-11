/**
 * Some basic commands for bot
 */

/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

module.exports.init = function() {
	var dispatcher = this.dispatcher;
	var irc = this.require('irc');

	this.addAction('quit', function(source, args) {
		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}

		source.respond('okey, ' + source.nick + '! Goodbye everypony!');
		irc.quit(args[1]);
	}, /^quit[ ]?(.*)$/i, ['owner']);

	this.addAction('part', function(source, args) {
		//dispatcher.on('irc/PART', ok);
		//is not needed as nothing can stop us from parting

		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}

		var chans = args[1].match(/#[\w\-\_]+/gi);
		if (chans !== null) {
			source.respond('okey, ' + source.nick + '! I didnt like the \'' + chans.join('\', \'') + '\' either.');
			irc.part.apply(irc, chans);
		} else if (source.channel) {
			source.respond('okey, ' + source.nick + '! I\'m going to look for ponies elsewhere.');
			irc.part(source.channel);
		} else {
			source.mention('please specify a channel.');
		}
	}, /^part([ ]+(.*)|)$/i, ['owner', 'operators']);

	this.addAction('join', function(source, args) {
		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}
		var chans = args[1].match(/#[\w\-\_]+/gi);
		if (chans !== null) {
			source.respond('okey, ' + source.nick + '! Lemme see what goes in \'' + chans.join('\', \'') + '\'.');

			var fail = function(s, args) {
				source.mention('i cannot go to \'' + args[1] + '\'! Because ' + args[2]);
				clean();
			};
			var ok = function(s, args) {
				if (s.nick === irc.currentNick) {
					source.respond('*ding*, i am now in \'' + args[0] + '\' too!');
					clean();
				}
			};

			var timer = setTimeout(clean, 5000);
			var clean = function() {
				dispatcher.off('irc/405', fail);
				dispatcher.off('irc/471', fail);
				dispatcher.off('irc/473', fail);
				dispatcher.off('irc/474', fail);
				dispatcher.off('irc/475', fail);
				dispatcher.off('irc/JOIN', ok);
				clearTimeout(timer);
			};

			dispatcher.on('irc/405', fail);
			dispatcher.on('irc/471', fail);
			dispatcher.on('irc/473', fail);
			dispatcher.on('irc/474', fail);
			dispatcher.on('irc/475', fail);
			dispatcher.on('irc/JOIN', ok);

			irc.join.apply(irc, chans);
		} else {
			source.mention('please specify a channel.');
		}
	}, /^join([ ]+(.*)|)$/i, ['owner', 'operators']);

	this.addAction('nick', function(source, args) {
		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}
		var nick = args[2];
		if (nick) {
			source.respond('okey, ' + source.nick + '! Lemmy try this new name.');

			var fail = function() {
				source.mention('i failed in renaming myself!');
				clean();
			};
			var inuse = function() {
				source.mention('i failed, somepony uses that name already!');
				clean();
			};
			var toofast = function() {
				source.mention('i failed, they told me i need to wait!');
				clean();
			};
			var ok = function(s) {
				if (s.nick === irc.lastNick) {
					source.mention('success! Do u like my new name?');
					clean();
				}
			};

			var timer = setTimeout(clean, 5000);
			var clean = function() {
				dispatcher.off('irc/430', fail);
				dispatcher.off('irc/431', fail);
				dispatcher.off('irc/432', fail);
				dispatcher.off('irc/433', inuse);
				dispatcher.off('irc/438', toofast);
				dispatcher.off('irc/NICK', ok);
				clearTimeout(timer);
			};

			dispatcher.on('irc/430', fail);
			dispatcher.on('irc/431', fail);
			dispatcher.on('irc/432', fail);
			dispatcher.on('irc/433', inuse);
			dispatcher.on('irc/438', toofast);
			dispatcher.on('irc/NICK', ok);

			irc.nick(nick);
		} else {
			source.respond('Hello, my name is ' + irc.currentNick);
		}
	}, /^nick([ ]+(.*)|)$/i, ['owner', 'operators']);

	var controls = this.require('controls');

	function actionList(source) {
		var actions = [];
		Object.keys(controls.actions).forEach(function(n) {
			if (this.controls.checkAccess(source, this.actions[n])) {
				actions.push(n);
			}
		}, controls);

		source.message('actions that can be triggered by you are: ' + actions.join(', '));
	}

	function commandList(source, args) {
		if (args[0] === 'actions' ||  args[1] === ' actions') {
			actionList(source);
			return;
		}

		var commands = [];
		Object.keys(controls.commands).forEach(function(n) {
			if (this.controls.checkAccess(source, this.commands[n])) {
				commands.push(n);
			}
		}, controls);

		source.mention('the available commands are: ' + controls.commandDelimiter + commands.join(', ' + controls.commandDelimiter));
	}

	this.addCommand('help', commandList).addAction('help', commandList, /^help( actions)?$/);

	//get moduleManager and save it for the commands
	var module = this;
	this.dispatcher.on('init', function(bot) {
		module.mm = bot.modules;
	});

	this.addAction('lsmod', function(source) {
		source.mention('i have these modules active: ' + module.mm.getModules().join(', '));
	}, /^lsmod|modules$/, ['owner']);

	this.addAction('reload', function(source, args) {
		var modules = args[1].match(/\w+/gi);
		var call = function(err, m) {
			if (err) {
				source.respond('module \'' + m + '\' failed to reload! ' + err);
			} else {
				source.respond('module \'' + m + '\' reloaded!');
			}
		};
		source.respond('okey, ' + source.nick + '! I reload it after i find it.');
		modules.forEach(function(name) {
			module.mm.reload(name, call);
		});
	}, /^reload[ ]+(.*)$/, ['owner']);

	this.addAction('load', function(source, args) {
		var modules = args[1].match(/\w+/gi);
		var call = function(err, m) {
			if (err) {
				source.respond('module \'' + m + '\' failed to load! ' + err);
			} else {
				source.respond('module \'' + m + '\' loaded!');
			}
		};
		source.respond('okey, ' + source.nick + '! I\'m really eager to learn new things!');
		modules.forEach(function(name) {
			module.mm.load(name, call);
		});
	}, /^load[ ]+(.*)$/, ['owner']);

	this.addAction('unload', function(source, args) {
		var modules = args[1].match(/\w+/gi);
		var call = function(err, m) {
			if (err) {
				source.respond('module \'' + m + '\' failed to unload! ' + err);
			} else {
				source.respond('module \'' + m + '\' unloaded!');
			}
		};
		source.respond('okey, ' + source.nick + '! Let\'s throw it away!');
		modules.forEach(function(name) {
			module.mm.unload(name, call);
		});
	}, /^unload[ ]+(.*)$/, ['owner']);


	this.addAction('say', function(source, args) {
		if (!irc.connected) {
			source.respond('I\'m not connected to server!');
			return;
		}
		var target = args[2];
		var msg = args[3];
		if (msg.trim() === '') {
			source.respond('you probadly should tell me what i should tell to \'' + target + '\'');
		} else {
			var resendreply = function(s, text) {
				if (target === s.nick) {
					source.respond(target + ' REPLY: ' + text);
					clean();
				}
			};
			var wrongnick = function(s, argv) {
				source.respond('Nick or channel with name \'' + argv[1] + '\' was not found.');
				clean();
			};
			var noExternal = function(s, argv) {
				source.respond('Channel \'' + argv[1] + '\' has blocked external messages.');
				clean();
			};

			var timer = setTimeout(clean, 5000);
			var clean = function() {
				dispatcher.off('irc/PRIVMSG', resendreply);
				dispatcher.off('irc/NOTICE', resendreply);
				dispatcher.off('irc/401', wrongnick);
				dispatcher.off('irc/404', noExternal);
				clearTimeout(timer);
			};

			//say it
			if (irc.privMsg(target, msg)) {
				dispatcher.on('irc/PRIVMSG', resendreply);
				dispatcher.on('irc/NOTICE', resendreply);
				dispatcher.on('irc/401', wrongnick);
				dispatcher.on('irc/404', noExternal);
			} else {
				source.mention('wait a little while...');
			}
		}
	}, /^(say|tell)[ ]+(#?[\w\_\-\\\[\]\{\}\^\`\|]+)[ ]*(.*)$/i, ['owner', 'operators']);

	this.addAction('update', function(source) {
		source.action('is fetching updates...');

		require('child_process').exec('cd ' + BOT_DIR + ' && git pull', function(error, stdout, stderr) {
			if (error) {
				source.respond('Update failed!');
				return;
			}

			var stdouts = stdout.replace(/\n$/, '').split('\n');
			var message = stdouts.shift();
			var updated_modules = [];
			var updated_core = false;
			var npm = false;
			var config = false;
			var uptodate = false;

			if (message) {
				if (message.match(/up\-to\-date/)) uptodate = true;
				source.respond(message);
			} else {
				source.respond('Update failed!');
				return;
			}

			if (stdouts.length > 0) {
				stdouts.forEach(function(value) {
					var tmp = value.match(/modules\/(.+)\.js/);
					if (tmp) {
						updated_modules.push(tmp[1]);
					} else {
						tmp = value.match(/app\.js|libs\//);
						if (tmp) {
							updated_core = true;
						} else {
							tmp = value.match(/package\.json/);
							if (tmp) {
								npm = true;
							} else {
								tmp = value.match(/example-config\.json/);
								if (tmp) {
									config = true;
								}
							}
						}
					}
				});
			}

			if (updated_core) {
				source.respond('CORE was updated, please restart the bot! ... Eh, i mean\'t: release the pony!');
			}

			if (npm) {
				source.respond('package.json was updated, please use \'npm install\'');
			}

			if (config) {
				source.respond('example-config.json was updated, please use check your configuration');
			}

			if (updated_modules.length > 0) {
				source.respond('Don\'t forget to reload updated modules: ' + updated_modules.join(', '));
			}

			if (!updated_core && updated_modules.length <= 0 && !uptodate) {
				source.respond('Nothing important has been updated.');
			}
		});
	}, /^update$/, ['owner']);
};