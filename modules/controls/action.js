function Action(name, action, rule) {
	if (!(rule instanceof RegExp)) {
		throw new Error('Rule must be RegExp!');
	}

	this.name = name;
	this.action = action;
	this.rule = rule;
}

module.exports.Action = Action;

module.exports.create = function(name, action, rule) {
	return new Action(name, action, rule);
};