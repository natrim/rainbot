'use strict';

var vows = require('vows'),
	assert = require('assert');

var suite = vows.describe('Bot class');

var BOT = require('../libs/bot');
var FS = require('fs');

suite.addBatch({
	'When i require bot': {
		topic: function() {
			return new BOT();
		},
		'then i get Bot instance': function(bot) {
			assert.isObject(bot);
			assert.instanceOf(bot, BOT);
		},
		'and \'BOT_PATH\' has app.js': function() {
			assert.isTrue(FS.existsSync(BOT_PATH + '/app.js'));
		}
	},
	'When i load config with': {
		'not existing config': {
			topic: function() {
				new BOT().loadConfig('not-exist-config.json', this.callback);
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
				new BOT().loadConfig(this.callback);
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
				new BOT().loadConfig({
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
				new BOT().loadConfig({
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
	},
	'When i load modules with': {
		'not existing files': {
			topic: function() {
				new BOT().loadModules('not-exist-modules-config.json', this.callback);
			},
			'then i get error': function(err, modules) {
				assert.isTrue(err);
			}
		},
		'object': {
			'one': {
				topic: function() {
					new BOT().loadModules({
						test: true
					}, this.callback);
				},
				'then i get module in list': function(err, modules) {
					assert.isNull(err);

					assert.isTrue(modules.some(function(module) {
						return module.name === 'test';
					}));
				}
			},
			'more': {
				topic: function() {
					new BOT().loadModules({
						test: true,
						test2: true
					}, this.callback);
				},
				'then i get module in list': function(err, modules) {
					assert.isNull(err);

					assert.isTrue(modules.some(function(module) {
						return module.name === 'test';
					}));
					assert.isTrue(modules.some(function(module) {
						return module.name === 'test2';
					}));
				}
			}
		},
		'array': {
			'one': {
				topic: function() {
					new BOT().loadModules(['test'], this.callback);
				},
				'then i get module in list': function(err, modules) {
					assert.isNull(err);

					assert.isTrue(modules.some(function(module) {
						return module.name === 'test';
					}));
				}
			},
			'more': {
				topic: function() {
					new BOT().loadModules(['test', 'test2'], this.callback);
				},
				'then i get module in list': function(err, modules) {
					assert.isNull(err);

					assert.isTrue(modules.some(function(module) {
						return module.name === 'test';
					}));
					assert.isTrue(modules.some(function(module) {
						return module.name === 'test2';
					}));
				}
			}
		},
		'directly': {
			'with callback': {
				topic: function() {
					new BOT().load('test', this.callback);
				},
				'then i get true': function(err, module) {
					assert.isNull(err);
				}
			},
			'with return': {
				topic: function() {
					var bot = new BOT();
					bot.load('test');
					return bot;
				},
				'and i find it in bot.modules': function(bot) {
					assert.isTrue(bot.modules.some(function(module) {
						return module.name === 'test';
					}));
				}
			}
		}
	}
});


suite.export(module);