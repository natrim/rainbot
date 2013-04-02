/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

function Command(name, action, access) {
	this.name = name;
	this.action = action;
	this.access = access;
}

module.exports.Command = Command;

module.exports.create = function(name, action, access) {
	return new Command(name, action, access);
};