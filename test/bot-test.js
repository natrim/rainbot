'use strict';

var vows = require('vows'),
	assert = require('assert');


var suite = vows.describe('Bot class');

suite.addBatch({
	'When i require bot': {
		topic: function() {
			return new(require('../src/bot'))();
		},
		'then i get Bot instance': function(bot) {
			assert.isObject(bot);
			assert.instanceOf(bot, require('../src/bot'));
		},
		'and \'BOT_PATH\' has app.js': function() {
			assert.isTrue(require('fs').existsSync(BOT_PATH + '/app.js'));
		}
	},
	'When i load': {
		'not existing config': {
			topic: function() {
				new(require('../src/bot'))().loadConfig('not-exist-config.json', this.callback);
			},
			'then i get error': function(err, config) {
				assert.isTrue(err);
			},
			'and empty config': function(err, config) {
				assert.lengthOf(config, 0);
			}
		},
		'default config': {
			topic: function() {
				new(require('../src/bot'))().loadConfig(this.callback);
			},
			'then i get config object': function(err, config) {
				assert.isNull(err);
				assert.isObject(config);
			},
			'with bot name': function(error, config) {
				assert.isObject(config.bot);
				assert.isString(config.bot.name);
			},
			'and module file': function(error, config) {
				assert.isObject(config.bot);
				assert.isString(config.bot.modules);
			}
		},
		'manual custom object': {
			topic: function() {
				new(require('../src/bot'))().loadConfig({
					'test': 'ok'
				}, this.callback);
			},
			'then il get custom config': function(err, config) {
				assert.isObject(config);
				assert.equal(config.test, 'ok');
			},
			'with bot name': function(error, config) {
				assert.isObject(config.bot);
				assert.isString(config.bot.name);
			},
			'and module file': function(error, config) {
				assert.isObject(config.bot);
				assert.isString(config.bot.modules);
			}
		},
		'manual custom object with twist': {
			topic: function() {
				new(require('../src/bot'))().loadConfig({
					'bot': {
						'name': 'Dash',
						'modules': 'dashing.json'
					}
				}, this.callback);
			},
			'with custom bot name \'Dash\'': function(error, config) {
				assert.isObject(config.bot);
				assert.equal(config.bot.name, 'Dash');
			},
			'and custom module file \'dashing.json\'': function(error, config) {
				assert.isObject(config.bot);
				assert.equal(config.bot.modules, 'dashing.json');
			}
		}
	}
});


suite.export(module);