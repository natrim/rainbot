'use strict';

//load assert lib
var assert = require('chai').assert;

var BOT = require(LIBS_DIR + '/bot').Bot;

describe('Bot class', function () {
	it('BOT_DIR should contain app.js', function () {
		assert.isTrue(require('fs').existsSync(BOT_DIR + '/app.js'));
	});

	var bot;
	beforeEach(function () {
		bot = new(require(LIBS_DIR + '/bot').Bot)();
	});

	describe('config', function () {
		it('loads config with object', function () {
			var bot = new BOT();
			bot.loadConfig({
				'bot': {
					'name': 'Dash',
					'modules': 'dashing.json'
				},
				'pony': {
					name: 'Trixie'
				}
			});
			bot.config.bot.autosave = false; //disable autosaving

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
					'modules': 'dashing.json'
				},
				'pony': {
					name: 'Trixie'
				}
			});
			bot.config.bot.autosave = false; //disable autosaving

			assert.property(bot.config, 'pony');

			bot.loadConfig({
				'bot': {
					'name': 'Dash',
					'modules': 'dashing.json'
				},
				'superpony': {
					name: 'Trixie'
				}
			}, true);

			assert.property(bot.config, 'pony');
		});
		it('can return config as json string', function () {
			var bot = new BOT();
			var config = {
				'bot': {
					'name': 'Dash',
					'modules': 'dashing.json'
				},
				'superpony': {
					name: 'Trixie'
				}
			};
			bot.loadConfig(config);
			bot.config.bot.autosave = false; //disable autosaving

			assert.equal(bot.saveConfig(null, true), JSON.stringify(config, null, 4));
		});
		it('can save config to json file', function () {
			after(function () {
				var fs = require('fs');
				if (fs.existsSync(BOT_DIR + '/test-config.json')) {
					fs.unlinkSync(BOT_DIR + '/test-config.json');
				}
			});

			var bot = new BOT();
			var config = {
				'bot': {
					'name': 'Dash',
					'modules': 'dashing.json'
				},
				'superpony': {
					name: 'Trixie'
				}
			};
			bot.loadConfig(config);
			bot.config.bot.autosave = false; //disable autosaving

			bot.saveConfig('test-config.json');

			assert.equal(require('fs').readFileSync(BOT_DIR + '/test-config.json'), JSON.stringify(config, null, 4));
		});
	});

	describe('modules', function () {
		var OLD_MODULES_DIR;
		before(function () {
			OLD_MODULES_DIR = MODULES_DIR;
			global.MODULES_DIR = require('path').resolve(BOT_DIR, 'test_modules');
		});

		after(function () {
			global.MODULES_DIR = OLD_MODULES_DIR;
		});

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
					'modules': 'test_modules/modules.json'
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
					'modules': ['test']
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
					}
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
		var OLD_MODULES_DIR;
		before(function () {
			OLD_MODULES_DIR = MODULES_DIR;
			global.MODULES_DIR = require('path').resolve(BOT_DIR, 'test_modules');
		});

		after(function () {
			global.MODULES_DIR = OLD_MODULES_DIR;
		});

		it('the config should be passed to module and back', function () {
			var bot = new BOT();
			var config = {
				'bot': {
					'name': 'Dash',
					'modules': ['test']
				},
				'test': {
					pony: 'Rainbow Dash'
				}
			};
			bot.loadConfig(config);
			bot.config.bot.autosave = false; //disable autosaving
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
					'modules': ['test']
				},
				'test': {
					ponies: {
						'bestpony': 'Rainbow Dash'
					}
				}
			};
			bot.loadConfig(config);
			bot.config.bot.autosave = false; //disable autosaving

			var t = bot.modules.require('test');
			assert.equal(t.config.ponies.bestpony, 'Rainbow Dash');

			config = {
				'bot': {
					'name': 'Dash',
					'modules': ['test']
				},
				'test': {
					ponies: {
						'bestpony': 'Derpy Hooves'
					}
				}
			};
			bot.loadConfig(config, true);
			bot.config.bot.autosave = false;

			assert.equal(t.config.ponies.bestpony, 'Derpy Hooves');
		});
		it('should reload the config if file changes', function () {
			var config = {
				'bot': {
					'name': 'Dash',
					'modules': ['test']
				},
				'test': {
					pony: 'Rainbow Dash'
				}
			};

			require('fs').writeFileSync(BOT_DIR + '/test-config.json', JSON.stringify(config, null, 4));

			after(function () {
				var fs = require('fs');
				if (fs.existsSync(BOT_DIR + '/test-config.json')) {
					fs.unlinkSync(BOT_DIR + '/test-config.json');
				}
			});

			var bot = new BOT();
			bot.loadConfig('test/test-config.json');
			bot.config.bot.autosave = false;

			assert.equal(bot.config.bot.name, 'Dash');

			var c = bot.modules.require('test').config;
			assert.equal(c.pony, 'Rainbow Dash');

			config.test.pony = 'Fluttershy';
			config.bot.name = 'Flutter';
			require('fs').writeFileSync(BOT_DIR + '/test-config.json', JSON.stringify(config, null, 4));

			assert.equal(c.pony, 'Fluttershy');
			assert.equal(bot.config.bot.name, 'Flutter');
		});
	});
});