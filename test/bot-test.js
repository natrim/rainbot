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
			'with default bot name \'IRC-PONY\'': function(error, config) {
				assert.isObject(config.bot);
				assert.equal(config.bot.name, 'IRC-PONY');
			},
			'and default module file \'modules.json\'': function(error, config) {
				assert.isObject(config.bot);
				assert.equal(config.bot.modules, 'modules.json');
			}
		},
		'manual custom object': {
			topic: function() {
				new(require('../src/bot'))().loadConfig({
					'test': 'ok'
				}, this.callback);
			},
			'then il get that object as config': function(err, config) {
				assert.isObject(config);
				assert.deepEqual(config, {
					'test': 'ok'
				});
				assert.equal(config.test, 'ok');
			}
		}
	}
});


suite.export(module);