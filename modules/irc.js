/**
 * IRC Core module
 * all the IRC parasprites
 */

'use strict';

var logger = require(LIBS_DIR + '/logger');

var Server = require('./irc/server').Server;
var Source = require('./irc/source').Source;

var date = require(LIBS_DIR + '/helpers').dateFormat;

//trim some strings
if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

function IRC(server, dispatcher, config) {
	this.server = server;
	this.config = config;
	this.dispatcher = dispatcher;

	Object.defineProperties(this, {
		'connected': {
			enumerable: true,
			configurable: false,
			get: function () {
				return server.connected;
			}
		},
		'connectedOn': {
			enumerable: true,
			configurable: false,
			get: function () {
				return server.connectedOn.getTime() / 1000;
			}
		},
		'lastNick': {
			enumerable: true,
			configurable: false,
			get: function () {
				return server.lastNick;
			}
		},
		'currentNick': {
			enumerable: true,
			configurable: false,
			get: function () {
				return server.currentNick;
			}
		}
	});

	this.recvBuffer = '';
	this.tryNick = [];
	this.connecting = false;
	this.disconnecting = false;
	this.shouldAutoJoin = true;

	//irc client heartbeat ping - because the socket sometimes hangs
	this._heartbeat = 0;
	if (typeof config.heartbeat !== 'number') {
		config.heartbeat = 120000; //default heartbeat interval
	}
	if (config.heartbeat > 0) {
		var irc = this;
		this._heartbeat = setInterval(function () {
			if (irc.server.connected) {
				irc.send('PING :' + irc.server.hostname, true);
			}
		}, config.heartbeat);
	}

	//reconnect support
	this._reconnect = 0;
}


IRC.prototype.connect = function () {
	if (this.server.connected) {
		logger.warn('Already connected.');
		return this;
	}
	if (this._reconnect) {
		clearTimeout(this._reconnect);
		this._reconnect = 0;
	}
	if (this.config.nick instanceof Array && this.config.nick.length > 0) {
		this.tryNick = this.config.nick.slice(0); //use clone
	} else {
		this.tryNick = ['ponbot', 'ponybot', 'a_weird_pony', 'another_ponbot']; //defaults
		if (typeof this.config.nick === 'string') {
			this.tryNick.unshift(this.config.nick);
		}
	}

	this.connecting = true;
	this.disconnecting = false;

	logger.info('CONNECTING TO \'' + this.server + '\'');

	var options = {
		allowHalfOpen: false,
		port: this.server.port,
		host: this.server.hostname
	};

	var irc = this;
	var config = this.config;
	var dispatcher = this.dispatcher;

	var socket = (this.server.secured ? require('tls') : require('net')).connect(options, function () {
		irc.server.connected = true;
		irc.server.connectedOn = new Date();

		logger.info('CONNECTED');

		//emit the connect event for other modules
		dispatcher.emit('irc/connect', irc);

		if (typeof config.pass === 'string' && config.pass.trim() !== '') {
			irc.pass(config.pass);
		}

		//try first nick
		irc.nick(irc.tryNick.shift());

		//set username to nick if none given
		if (!config.username) {
			config.username = irc.server.currentNick;
		}

		//mode
		var mode = (config.wallops ? 4 : 0) + (config.invisible ? 8 : 0);

		//set the user
		irc.user(config.username, config.realname ? config.realname : config.username, mode);
	});

	socket.setEncoding('utf8');
	socket.setNoDelay(true);
	socket.setTimeout(0);

	socket.on('error', function (err) {
		dispatcher.emit('irc/error', err, irc);
		logger.error(err);
		irc._hadError = err; //push the error
		socket.destroy(); //destroy socket
	});

	socket.on('timeout', function () {
		dispatcher.emit('irc/timeout', irc);
		socket.destroy(); //destroy socket
	});

	socket.on('close', function (hadError) {
		if (irc._hadError) { //get pushed error as primary one
			hadError = irc._hadError;
			delete irc._hadError;
		}
		irc.connecting = false;
		irc.server.connected = false;
		irc.server.connectedOn = null;
		if (irc._reconnectServer()) {
			return;
		}
		this.disconnecting = false;
		dispatcher.emit('irc/disconnect', hadError, irc);
		logger.info('DISCONNECTED' + (hadError ? ' WITH ERROR' : ''));
	});

	socket.on('data', function (data) {
		dispatcher.emit('irc/data', data, irc);
		irc.processData(data);
	});

	//bind basic socket commands
	this.server.write = socket.write.bind(socket);
	this.server.end = socket.end.bind(socket);

	this.server.socket = socket;

	return this;
};

IRC.prototype._reconnectServer = function () {
	if (!this.config.reconnect) {
		return false;
	}
	if (this.disconnecting) {
		return false;
	}

	if (this._reconnect === 0) {
		logger.info('CONNECTION TIMEOUT');
		logger.info('Automatic reconnect in ' + (this.config.reconnectRetryDelay / 1000) + 's');
		var irc = this;
		this._reconnect = setTimeout(function () {
			irc._reconnect = 0;
			irc.connect();
		}, this.config.reconnectRetryDelay);
	}

	return true;
};

IRC.prototype.processData = function (data) {
	var lines = (this.recvBuffer + data).split('\r\n');
	for (var i = 0; i < lines.length - 1; i++) {
		this.processLine(lines[i]);
	}
	this.recvBuffer = lines[lines.length - 1];
};

IRC.prototype.processLine = function (line) {
	line = line.trim();

	if (line === '') {
		return;
	}

	var msg = this.parseLine(line);

	if (!msg) {
		return;
	}

	var source, text;

	if (msg.prefix) {
		source = Source.fromString(this, msg.prefix);
	}

	if (msg.command) {
		if (msg.command !== 'PING' && msg.command !== 'PONG') { //if not ping/pong then log and emit it
			if (this.config.log) {
				console.log(date(undefined, this.config.logTimeFormat) + ' [RECV]> ' + line);
			} else {
				logger.debug('[RECV]> ' + line);
			}

			this.dispatcher.emit('irc/RECV', line, this);
		}

		var args = msg.params.slice(0);
		args.push(msg.trail);

		var handled = false;

		switch (msg.command) {
		case 'ERROR':
			//handle error timeout
			if (/(timeout|timed out)/i.test(args[0])) {
				if (this.disconnecting) { //ignore timeout on quit - some servers remove clients using this
					break;
				}
				var error = new Error('connection ETIMEDOUT');
				error.code = 'ETIMEDOUT';
				this.server.socket.emit('error', error); //mask it as socket error
				handled = true;
			}
			break;
		case 'NOTICE':
			source.channel = args[0] === this.server.currentNick ? '' : args[0];
			text = args[1] || '';
			if (text.charCodeAt(0) === 1 && text.charCodeAt((text.length - 1)) === 1) {
				text = text.slice(1);
				text = text.slice(0, (text.length - 1));
				if (this.processCTCP(source, text, 'notice')) {
					this.dispatcher.emit('irc/CTCP', source, text, 'notice', this);
				}
			} else {
				this.dispatcher.emit('irc/NOTICE', source, text, this);
			}
			handled = true;
			break;
		case 'PRIVMSG':
			source.channel = args[0] === this.server.currentNick ? '' : args[0];
			text = args[1] || '';
			if (text.charCodeAt(0) === 1 && text.charCodeAt((text.length - 1)) === 1) {
				text = text.slice(1);
				text = text.slice(0, (text.length - 1));
				if (this.processCTCP(source, text, 'privmsg')) {
					this.dispatcher.emit('irc/CTCP', source, text, 'privmsg', this);
				}
			} else {
				this.dispatcher.emit('irc/PRIVMSG', source, text, this);
			}
			handled = true;
			break;
		case 'PING':
			//pingpong heartbeat
			this.send('PONG :' + args[0], true);
			handled = true;
			break;
		case 'NICK':
			//nick change
			if (source.nick === this.server.currentNick) {
				this.server.lastNick = this.server.currentNick;
				this.server.currentNick = args[0];
			}
			break;
		case '001':
			//done connecting
			this.connecting = false;
			//autojoin
			if (this.shouldAutoJoin) {
				setTimeout(this.tryAutoJoin.bind(this), 2000); //give it a sec or two
			}
			break;
		case '430':
		case '431':
		case '432':
		case '433':
			//nick problem
			if (this.connecting) {
				if (this.tryNick.length > 0) { //if we still have some nicks then try them
					this.nick(this.tryNick.shift());
				} else {
					logger.error('No available nick found!');
					this.quit('Nooo...');
				}
				handled = true;
			}
			break;
		}

		if (!handled) {
			this.dispatcher.emit('irc/' + msg.command.toUpperCase(), source, args, this);
		}
	}
};

IRC.prototype.parseLine = function (line) {
	var match = line.match(/^(:(\S+) )?(\S+)( (?!:)(.+?))?( :(.+))?$/);
	return match ? {
		'prefix': match[2],
		'command': match[3],
		'params': match[5] ? match[5].split(' ') : [],
		'trail': match[7]
	} : null;
};


IRC.prototype.send = function (msg, nolog) {
	if (!this.server.connected) { //dont write if no connection
		return this;
	}

	//replace newline by space to avoid breaking
	msg = msg.replace(/\r?\n|\r/g, ' ');

	//ensure utf8
	msg = msg.toString('utf8');

	var callback = function () {
			if (!nolog) {
				this.dispatcher.emit('irc/SEND', msg, this);
			}

			if (this.config.log) {
				if (!nolog) {
					console.log(date(undefined, this.config.logTimeFormat) + ' [SEND]> ' + msg);
				}
			} else {
				logger.debug('[SEND]> ' + msg);
			}
		};

	this.server.write(msg + '\r\n', callback.bind(this));

	return this;
};

IRC.prototype.end = function (msg, nolog) {
	if (!this.server.connected) {
		return this;
	}
	this.disconnecting = true;
	if (msg) {
		this.send(msg, nolog);
	}
	this.server.end();
	return this;
};

IRC.prototype.pass = function (pass) {
	return this.send('PASS :' + pass);
};

IRC.prototype.nick = function (nick) {
	if (this.connecting) {
		this.server.currentNick = nick;
	}
	return this.send('NICK :' + nick);
};

IRC.prototype.user = function (username, realname, mode) {
	return this.send('USER ' + username + ' ' + mode + ' * :' + realname);
};

IRC.prototype.join = function () {
	return this.send('JOIN ' + Array.prototype.join.call(arguments, ','));
};

IRC.prototype.part = function () {
	return this.send('PART ' + Array.prototype.join.call(arguments, ','));
};

IRC.prototype.quit = function (message) {
	return this.end('QUIT :' + (message || this.config.quitMessage || 'Terminating...'));
};

IRC.prototype.privMsg = function (nick, message) {
	var now = Date.now();

	if (message === this.server.lastMsg && now - this.server.lastMsgTime < (this.config.msgDelay || 1000)) {
		return null;
	}

	this.server.lastMsgTo = nick;
	this.server.lastMsg = message;
	this.server.lastMsgTime = now;

	return this.send('PRIVMSG ' + nick + ' :' + message);
};

IRC.prototype.notice = function (nick, message) {
	var now = Date.now();

	if (message === this.server.lastMsg && now - this.server.lastMsgTime < (this.config.msgDelay || 1000)) {
		return null;
	}

	this.server.lastMsgTo = nick;
	this.server.lastMsg = message;
	this.server.lastMsgTime = now;

	return this.send('NOTICE ' + nick + ' :' + message);
};

IRC.prototype.ctcp = function (nick, message, type) {
	type = typeof type === 'string' ? type.toLowerCase() : 'privmsg';
	if (type === 'notice') {
		return this.notice(nick, String.fromCharCode(0x01) + message + String.fromCharCode(0x01));
	} else {
		return this.privMsg(nick, String.fromCharCode(0x01) + message + String.fromCharCode(0x01));
	}
};

IRC.prototype.action = function (channel, action) {
	return this.ctcp(channel, 'ACTION ' + action, 'privmsg');
};

//returning false means no CTCP event
IRC.prototype.processCTCP = function (source, msg, type) {
	type = typeof type === 'string' ? type.toLowerCase() : 'privmsg';
	if (type === 'privmsg') {
		var parts = msg.split(' ');
		switch (parts[0]) {
		case 'VERSION':
			this.ctcp(source.nick, 'VERSION Friendship Powered PonyBot', 'notice');
			return false;
		case 'TIME':
			this.ctcp(source.nick, 'TIME ' + (new Date()).toUTCString(), 'notice');
			return false;
		case 'PING':
			this.ctcp(source.nick, msg, 'notice');
			return false;
		}
	}
	return true;
};

IRC.prototype.tryAutoJoin = function () {
	var channels;
	if (typeof this.config.channel === 'string') {
		channels = this.config.channel.split(',');
	} else if (this.config.channel instanceof Array) {
		channels = this.config.channel;
	} else {
		return;
	}

	this.join.apply(this, channels.map(function (c) {
		if (!(/^#/.test(c))) {
			c = '#' + c;
		}
		return c.trim();
	}));
};

exports.IRC = IRC;

exports.init = function (reload) {
	if (!reload) {
		this.server = new Server(this.config.hostname || this.config.host || this.config.server, this.config.port, this.config.ssl || this.config.secured);
	}

	this.irc = new IRC(this.server, this.dispatcher, this.config);

	var module = this;

	if (!reload) {
		Object.defineProperties(this, {
			'connected': {
				enumerable: true,
				configurable: false,
				get: function () {
					return module.server.connected;
				}
			},
			'connectedOn': {
				enumerable: true,
				configurable: false,
				get: function () {
					return module.server.connectedOn.getTime() / 1000;
				}
			},
			'lastNick': {
				enumerable: true,
				configurable: false,
				get: function () {
					return module.server.lastNick;
				}
			},
			'currentNick': {
				enumerable: true,
				configurable: false,
				get: function () {
					return module.server.currentNick;
				}
			}
		});
	}

	//export functions
	require(LIBS_DIR + '/helpers').export(this, this.irc, ['command', 'join', 'part', 'connect', 'quit', 'nick', 'ctcp', 'action', 'notice', 'privMsg']);

	//check the autoconnect config
	if (typeof this.config.autoconnect !== 'boolean') {
		this.config.autoconnect = false;
	}

	//check the reconnect config
	if (typeof this.config.reconnect !== 'boolean') {
		this.config.reconnect = false;
	}

	if (typeof this.config.reconnectRetryDelay !== 'number') {
		this.config.reconnectRetryDelay = 120000;
	}

	//connect to server on bot init
	this.dispatcher.on('init', function () {
		if (module.config.autoconnect) {
			module.irc.connect();
		} else {
			logger.info('IRC ready, autoconnect disabled...');
		}
	});

	//quit irc on bot halt
	this.dispatcher.on('halt', function () {
		if (module.server.socket) {
			if (module.server.secured) {
				module.server.socket.removeAllListeners('secureConnect');
			} else {
				module.server.socket.removeAllListeners('connect');
			}
		}

		if (module.server.connected) {
			module.irc.quit('Pony kill!');
		}
	});
};

exports.halt = function (reload) {
	//stop heartbeat
	if (this.irc._heartbeat) {
		clearInterval(this.irc._heartbeat);
		this.irc._heartbeat = 0;
	}
	if (this.irc._reconnect) {
		clearTimeout(this.irc._reconnect);
		this.irc._reconnect = 0;
	}
	//quit on module halt
	if (!reload && this.server.connected) {
		this.irc.quit('Pony going to sleep...');
	}
};