/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */
'use strict';

function Action(name, action, rule, access) {
	if (!(rule instanceof RegExp)) {
		throw new Error('Rule must be RegExp!');
	}

	this.name = name;
	this.action = action;
	this.rule = rule;
	this.access = access;
}

module.exports.Action = Action;

module.exports.create = function(name, action, rule, access) {
	return new Action(name, action, rule, access);
};