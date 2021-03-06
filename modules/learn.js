'use strict';

//trim some strings
if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

var Learning = function (m) {
	this.module = m;
};

Learning.prototype.reply = function (source, text) {
	if (text.substr(0, 1) === '?' && text.substr(1).trim() !== '') {
		if (typeof this.module.config.terms[text.substr(1).trim()] === 'string') {
			source.reply(this.module.config.terms[text.substr(1).trim()]);
		} else {
			source.mention('i\'m pretty sure i don\'t have this in my books');
		}
	}
};

Learning.prototype.replyAction = function (source, args, text) {
	return this.reply(source, text);
};

Learning.prototype.learnCommand = function (source, args) {
	var word = args.shift();
	var text = args.join(' ');
	if (word !== '') {
		if (text.trim() !== '') {
			var old = (typeof this.module.config.terms[word] === 'string');
			this.module.config.terms[word] = text;
			source.mention('you successfully managed to ' + (old ? 're-' : '') + 'learn me "' + word + '"');
		} else if (typeof this.module.config.terms[word] === 'string') {
			delete this.module.config.terms[word];
			source.mention('you successfully managed to unlearn me "' + word + '"');
		} else {
			source.mention('you need to learn me in with: <word> <some text>');
		}
	} else {
		source.mention('you need to learn me in with: <word> <some text>');
	}
};

Learning.prototype.learnAction = function (source, args) {
	args.shift(); //throw the main one out
	return this.learnCommand(source, args);
};

Learning.prototype.list = function (source) {
	source.reply('i learned all this: ' + Object.keys(this.module.config.terms).join(', '));
};

exports.init = function () {
	if (typeof this.config.terms === 'undefined') {
		this.config.terms = {};
	}
	this.learning = new Learning(this);
	this.addCommand('list', this.learning.list.bind(this.learning))
		.addAction('list', this.learning.list.bind(this.learning), /^list$/)
		.addCommand('learn', this.learning.learnCommand.bind(this.learning), ['owner', 'operators'])
		.addAction('learn', this.learning.learnAction.bind(this.learning), /^learn (\w+){1} (.*)$/, ['owner', 'operators'])
		.addAction('learnreply', this.learning.replyAction.bind(this.learning), /^\?[ ]*(\w+){1}$/);
	this.dispatcher.on('irc/PRIVMSG', this.learning.reply.bind(this.learning));
};
