'use strict';

//load assert lib
var assert = require('chai').assert;

var BOT = require('./../../libs/bot').Bot;

describe('Bot class', function () {
	describe('config', function () {
		it('loads config with object', function () {
			var bot = new BOT();
			bot.loadConfig({
				'bot': {
					'name': 'Dash',
					'modules': 'dashing.json',
					'autosave': false
				},
				'pony': {
					'name': 'Trixie'
				}
			});

			assert.isObject(bot.config.bot);
			assert.equal(bot.config.bot.name, 'Dash');
			assert.equal(bot.config.bot.modules, 'dashing.json');

			assert.property(bot.config, 'pony');
			assert.property(bot.config.pony, 'name');
			assert.equal(bot.config.pony.name, 'Trixie');
		});
		it('loads config with filename', function () {
			var bot = new BOT();
			bot.loadConfig('example-config.json');
			bot.config.bot.autosave = false; //disable autosaving
			assert.isObject(bot.config);

			assert.isObject(bot.config.bot);
			assert.isString(bot.config.bot.name);

			assert.isObject(bot.config.bot);
			assert.isString(bot.config.bot.modules);
		});
		it('merges configs if passed true as 2nd param', function () {
			var bot = new BOT();
			bot.loadConfig({
				'bot': {
					'name': 'Dash',
					'modules': 'dashing.json',
					'autosave': false
				},
				'pony': {
					'name': 'Trixie'
				}
			});

			assert.property(bot.config, 'pony');

			bot.loadConfig({
				'bot': {
					'name': 'Dash',
					'modules': 'dashing.json'
				},
				'superpony': {
					'name': 'Trixie'
				}
			}, true);

			assert.property(bot.config, 'pony');
		});
		it('can return config as json string', function () {
			var bot = new BOT();
			var config = {
				'bot': {
					'name': 'Dash',
					'modules': 'dashing.json',
					'autosave': false,
					'debug': false
				},
				'superpony': {
					'name': 'Trixie'
				}
			};
			bot.loadConfig(config);

			assert.equal(bot.saveConfig(null, true), JSON.stringify(config, null, 4));
		});
		it('can save config to json file', function () {
			var cpath = require('path').resolve(__dirname, '../..', 'test-config.json');
			after(function () {
				var fs = require('fs');
				if (fs.existsSync(cpath)) {
					fs.unlinkSync(cpath);
				}
			});

			var bot = new BOT();
			var config = {
				'bot': {
					'name': 'Dash',
					'modules': 'dashing.json',
					'autosave': false,
					'debug': false
				},
				'superpony': {
					'name': 'Trixie'
				}
			};
			bot.loadConfig(config);

			bot.saveConfig('test-config.json');

			assert.equal(require('fs').readFileSync(cpath), JSON.stringify(config, null, 4));
		});
		
		it('can load config from json file', function () {
			var cpath = require('path').resolve(__dirname, '../..', 'test-config.json');
			after(function () {
				var fs = require('fs');
				if (fs.existsSync(cpath)) {
					fs.unlinkSync(cpath);
				}
			});

			var bot = new BOT();
			var config = {
				'bot': {
					'name': 'Dash',
					'modules': 'dashing.json',
					'autosave': false,
					'debug': false
				},
				'superpony': {
					'name': 'Trixie'
				}
			};
			
			require('fs').writeFileSync(cpath, JSON.stringify(config, null, 4));
			
			bot.loadConfig('test-config.json');

			assert.deepEqual(config, bot.config);
		});
	});

	describe('modules', function () {
		var bot;
		beforeEach(function () {
			bot = new BOT();
			bot.loadConfig({});
			bot._coreModules = [];
		});

		it('loads modules by object', function () {
			assert.isFalse(bot.modules.has('test'));
			assert.isFalse(bot.modules.has('test2'));
			bot.loadModules({
				'test': true,
				'test2': false
			});
			assert.isTrue(bot.modules.has('test'));
			assert.isFalse(bot.modules.has('test2'));
		});
		it('loads modules by array', function () {
			assert.isFalse(bot.modules.has('test2'));

			bot.loadModules(['test2']);
			assert.isTrue(bot.modules.has('test2'));
		});
		it('loads modules from json file', function () {
			assert.isFalse(bot.modules.has('test2'));
			assert.isFalse(bot.modules.has('test'));
			bot.loadModules('test_modules/modules.json');
			assert.isTrue(bot.modules.has('test2'));
			assert.isFalse(bot.modules.has('test'));
		});
		it('loads modules from json file defined in config', function () {
			bot.loadConfig({
				'bot': {
					'modules': 'test_modules/modules.json',
					'autosave': false
				}
			});

			assert.isFalse(bot.modules.has('test2'));
			assert.isFalse(bot.modules.has('test'));
			bot.loadModules();
			assert.isTrue(bot.modules.has('test2'));
			assert.isFalse(bot.modules.has('test'));
		});

		it('loads modules from json file defined in config in array', function () {
			bot.loadConfig({
				'bot': {
					'modules': ['test'],
					'autosave': false
				}
			});

			assert.isFalse(bot.modules.has('test'));
			bot.loadModules();
			assert.isTrue(bot.modules.has('test'));
		});

		it('loads modules from json file defined in config in object', function () {
			bot.loadConfig({
				'bot': {
					'modules': {
						'test': true,
						'test2': true
					},
					'autosave': false
				}
			});

			assert.isFalse(bot.modules.has('test2'));
			assert.isFalse(bot.modules.has('test'));
			bot.loadModules();
			assert.isTrue(bot.modules.has('test2'));
			assert.isTrue(bot.modules.has('test'));
		});
	});

	describe('others', function () {
		it('the config should be passed to module and back', function () {
			var bot = new BOT();
			var config = {
				'bot': {
					'name': 'Dash',
					'modules': ['test'],
					'autosave': false
				},
				'test': {
					'pony': 'Rainbow Dash'
				}
			};
			bot.loadConfig(config);

			var c = bot.modules.require('test').config;
			assert.property(c, 'pony');
			assert.equal(c.pony, 'Rainbow Dash');

			c.nextup = 'Twilight Sparkle';

			assert.property(config.test, 'nextup');
			assert.equal(config.test.nextup, 'Twilight Sparkle');
		});
		it('the config should be passed to module and back even AFTER config file reload', function () {
			var bot = new BOT();
			var config = {
				'bot': {
					'name': 'Dash',
					'modules': ['test'],
					'autosave': false
				},
				'test': {
					'ponies': {
						'bestpony': 'Rainbow Dash'
					}
				}
			};
			bot.loadConfig(config);

			var t = bot.modules.require('test');
			assert.equal(t.config.ponies.bestpony, 'Rainbow Dash');

			config = {
				'bot': {
					'name': 'Dash',
					'modules': ['test'],
					'autosave': false
				},
				'test': {
					'ponies': {
						'bestpony': 'Derpy Hooves'
					}
				}
			};
			bot.loadConfig(config, true);

			assert.equal(t.config.ponies.bestpony, 'Derpy Hooves');
			assert.equal(bot.modules.require('test').config.ponies.bestpony, 'Derpy Hooves');
		});
	});
});
