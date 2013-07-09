'use strict';

//load assert lib
var assert = require('chai').assert;

var M = require(LIBS_DIR + '/module');
var MM = require(LIBS_DIR + '/moduleManager');
var EventEmitter = require('events').EventEmitter;

describe('ModuleManager class', function () {
	var OLD_MODULES_DIR;

	before(function () {
		OLD_MODULES_DIR = MODULES_DIR;
		global.MODULES_DIR = require('path').resolve(BOT_DIR, 'test_modules');
	});

	after(function () {
		global.MODULES_DIR = OLD_MODULES_DIR;
	});

	describe('creation', function () {
		it('throws error if no config', function () {
			assert.throws(function () {
				return new MM.ModuleManager(new EventEmitter());
			}, 'No config given!');
		});
		it('throws error if wrong dispatcher', function () {
			assert.throws(function () {
				return new MM.ModuleManager();
			}, 'No dispatcher given!');

			assert.throws(function () {
				return new MM.ModuleManager({});
			}, 'Wrong dispatcher given!');
		});

		it('creates MM using new', function () {
			var mm;
			assert.doesNotThrow(function () {
				mm = new MM.ModuleManager(new EventEmitter(), {});
			});
			assert.instanceOf(mm, MM.ModuleManager);
		});
		it('creates MM using #create', function () {
			var mm;
			assert.doesNotThrow(function () {
				mm = MM.create(new EventEmitter(), {});
			});
			assert.instanceOf(mm, MM.ModuleManager);
		});
	});

	describe('working', function () {
		var mm;
		beforeEach(function () {
			mm = MM.create(new EventEmitter(), {});
		});

		it('should load modules using #load', function () {
			assert.notProperty(mm._modules, 'test');

			assert.doesNotThrow(function () {
				mm.load('test');
			});

			assert.property(mm._modules, 'test');
		});
		it('should return true if module is loaded, using #has', function () {
			assert.doesNotThrow(function () {
				mm.load('test');
			});

			assert.isTrue(mm.has('test'));
			assert.isFalse(mm.has('ponylitis'));
		});
		it('should return module using #get', function () {
			assert.doesNotThrow(function () {
				mm.load('test');
			});

			var m = mm.get('test');

			assert.instanceOf(m, M.Module);
			assert.equal(m.name, 'test');
			assert.isTrue(m.loaded);
			assert.isObject(m.context);

			assert.isNull(mm.get('wrong pony'));
		});
		it('should return modules using #getModules', function () {
			assert.deepEqual(mm.getModules(), []);
			mm.load('test');
			assert.include(mm.getModules(), 'test');
			assert.notInclude(mm.getModules(), 'test2');
			assert.deepEqual(mm.getModules(), ['test']);
		});
		it('should autoload and return module on #require', function () {
			assert.isFalse(mm.has('test'));
			var test = mm.require('test');
			assert.isNotNull(test);
			assert.equal(test.name, 'test');
			assert.isTrue(mm.has('test'));
		});
		it('should unload modules using #unload', function () {
			mm.load('test');
			assert.isTrue(mm.has('test'));
			mm.unload('test');
			assert.isFalse(mm.has('test'));
			assert.notProperty(mm._modules, 'test');
		});
		it('should reload modules using #reload', function () {
			mm.load('test');
			assert.equal(mm.get('test').testInit, 'Many ponies!');
			mm.reload('test');
			assert.equal(mm.get('test').testInit, 'Reload Many ponies!');
		});
		it('should protect module from #unload using #protect', function () {
			mm.load('test');
			mm.protect('test');

			assert.throws(function () {
				mm.unload('test');
			}, 'Module \'test\' is protected!');

			assert.isTrue(mm.has('test'));
		});
	});

	describe('errors', function () {
		var mm;
		beforeEach(function () {
			mm = MM.create(new EventEmitter(), {});
		});

		it('throws error on #load', function () {
			mm.load('test');

			assert.throws(mm.load.bind(mm), 'Please enter a name!');

			assert.throws(mm.load.bind(mm, 'test'), 'Module \'test\' is already loaded!');

			assert.throws(mm.load.bind(mm, 'syntaxerror'), 'Error happened during module \'syntaxerror\' init: Failed loading context of \'syntaxerror\' module! podule is not defined');

			assert.throws(mm.load.bind(mm, 'test22'), 'Error happened during module \'test22\' load: Module \'test22\' does not exists!');
		});
		it('throws error on #unload', function () {
			assert.throws(mm.unload.bind(mm), 'Please enter a name!');
			assert.throws(mm.unload.bind(mm, 'test'), 'Module \'test\' is not loaded!');

			mm.load('syntaxerrorhalt');
			assert.throws(mm.unload.bind(mm, 'syntaxerrorhalt'), 'Error happened during module \'syntaxerrorhalt\' halt: Failed unloading context of \'syntaxerrorhalt\' module! derp is not defined');

			mm.load('test');
			mm.protect('test');
			assert.throws(mm.unload.bind(mm, 'test'), 'Module \'test\' is protected!');
		});
		it('throws error on #reload', function () {
			assert.throws(mm.reload.bind(mm, 'test'), 'Module \'test\' is not loaded!');
			assert.throws(mm.reload.bind(mm), 'Please enter a name!');

			mm.load('syntaxerrorhalt');
			assert.throws(mm.reload.bind(mm, 'syntaxerrorhalt'), 'Error happened during module \'syntaxerrorhalt\' reload: derp is not defined');
		});
		it('throws error on #require if no name', function () {
			assert.throws(mm.require.bind(mm), 'Please enter a name!');
		});
		it('throws error on #protect if no name', function () {
			assert.throws(mm.protect.bind(mm), 'Please enter a name!');
		});
	});

	describe('others', function () {
		var mm, ee, cc;
		beforeEach(function () {
			ee = new EventEmitter();
			cc = {};
			mm = MM.create(ee, cc);
		});

		it('should have config propagation from module to MM.config', function () {
			mm.require('test').config.pony = 'Twilight Sparkle';

			assert.property(cc, 'test');
			assert.property(cc.test, 'pony');
			assert.equal(cc.test.pony, 'Twilight Sparkle');
		});
		it('should put module events on MM.dispatcher', function (done) {
			mm.require('test').dispatcher.on('test/test', function () {
				done();
			});

			ee.emit('test/test');
		});
		it('the #require should be able to work from module', function () {
			assert.isNull(mm.require('test').require('derp'));
			assert.isNull(mm.require('test').require());
			var m = mm.require('test');
			assert.equal(m.require('test'), m);
		});
	});
});