module.exports.init = function() {
	var c = this.require('controls');
	c.addAction('question', function(source) {
		source.respond('don\'t ask me, i\'m just a talking pony');
	}, /\?\s*$/);

	c.addAction('bot', function(source) {
		source.respond('i\'m not a bot, i\'m a real pony');
	}, /[\s,\.]bot[\s!,\.\$]/);

	c.addAction('welcome', function(source) {
		source.respond('hi ' + source.nick);
	}, /^(ahoj|holla|cau|hi|hello|cus|ciao|g'day|how's it going|(good )?(morning|afternoon|evening|day))/);
};

module.exports.halt = function() {
	var c = this.require('controls');

	c.removeAction('question').removeAction('bot').removeAction('welcome');
};