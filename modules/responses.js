/**
 * Some default responses
 */

'use strict';

module.exports.init = function () {
	this.addAction('question', function (source) {
		source.respond('don\'t ask me, i\'m just a talking pony!');
	}, /\?\s*$/);

	this.addAction('bot', function (source) {
		source.respond('i\'m not a bot, i\'m a real pony!');
	}, /[\s,\.]bot[\s!,\.\$]/);

	this.addAction('welcome', function (source) {
		source.respond('hi ' + source.nick);
	}, /^(ahoj|holla|cau|hi|hello|cus|ciao|g'day|how's it going|(good )?(morning|afternoon|evening|day))/);
};
