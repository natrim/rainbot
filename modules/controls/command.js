function Command(name, action) {
	this.name = name;
	this.action = action;
}

module.exports.Command = Command;

module.exports.create = function(name, action) {
	return new Command(name, action);
};