/* jslint node: true */
/* global BOT_DIR, LIBS_DIR, MODULES_DIR */

//mocha globals
/* global describe, it, before, after, beforeEach, afterEach */

//strict
'use strict';

//load assert lib
var assert = require('chai').assert;

describe('Bot class', function() {
	it('BOT_DIR should contain app.js', function() {
		assert.isTrue(require('fs').existsSync(BOT_DIR + '/app.js'));
	});

	var bot;
	beforeEach(function() {
		bot = new(require(LIBS_DIR + '/bot').Bot)();
	});

	describe('config', function() {
		it('loads config with object');
		it('loads config with filename');
		it('loads default config on empty input');
		it('throws error on wrong config');
	});

	describe('modules', function() {
		it('loads modules by object or array');
		it('loads modules from json file');
		it('loads modules from json file defined in config');
		it('loads default modules');
	});
});