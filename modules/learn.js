'use strict';

var Learning = function (m) {
	this.module = m;
};

Learning.prototype.reply = function (source, text) {
	if (text.substr(0, 2) === '? ') {
		if (typeof this.module.config.terms[text.substr(2)] === 'string') {
			source.reply(this.module.config.terms[text.substr(2)]);
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
	if (word) {
		this.module.config.terms[word] = text;
		source.mention('you sucessusfully managed to learn me "' + word + '"');
	} else {
		source.mention('you need to learn me in: <word> <some text>');
	}
};

Learning.prototype.learnAction = function (source, args) {
	args.shift(); //throw the main one out
	return this.learnCommand(source, args);
};

exports.init = function () {
	if (typeof this.config.terms === 'undefined') {
		this.config.terms = {};
	}
	this.learning = new Learning(this);
	this.addCommand('learn', this.learning.learnCommand.bind(this.learning), ['owner', 'operators'])
		.addAction('learn', this.learning.learnAction.bind(this.learning), /^learn (\w+){1} (.*)$/, ['owner', 'operators'])
		.addAction('learnreply', this.learning.replyAction.bind(this.learning), /^\? (\w+){1}$/);
	this.dispatcher.on('PRIVMSG', this.learning.reply.bind(this.learning));
};