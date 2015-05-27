'use strict';

//load assert lib
var assert = require('chai').assert;

var MODULE = require('./../../libs/module');
var EventEmitter = require('events').EventEmitter;

describe('Module class', function () {
	describe('creation', function () {
		it('throws Error without name', function () {
			assert.throws(function () {
				return new MODULE.Module();
			}, 'You need to specifify module name!');
		});

		it('creates module using new', function () {
			var m;
			assert.doesNotThrow(function () {
				m = new MODULE.Module('test');
			});
			assert.isObject(m);
			assert.instanceOf(m, MODULE.Module);
			assert.equal(m.name, 'test');
			assert.equal(m, 'test');
		});

		it('creates module using #create', function () {
			var m;
			assert.doesNotThrow(function () {
				m = MODULE.create('test');
			});
			assert.isObject(m);
			assert.instanceOf(m, MODULE.Module);
			assert.equal(m.name, 'test');
			assert.equal(m, 'test');
		});

		it('throws error when module does not exists in module dir', function () {
			assert.throws(function () {
				return MODULE.create('test222');
			}, 'Module \'test222\' does not exists!');
		});

		it('loads even syntax error module', function () {
			var m;
			assert.doesNotThrow(function () {
				m = MODULE.create('syntaxerror');
			});

			assert.isObject(m);
			assert.equal(m, 'syntaxerror');
		});
	});

	describe('working module', function () {
		var module;
		beforeEach(function () {
			module = MODULE.create('test');
		});

		describe('#injectConfig', function () {
			it('throws error on empty inject', function () {
				assert.throws(module.injectConfig.bind(module), 'Config needs to be object!');

				assert.throws(function () {
					module.injectConfig(undefined);
				}, 'Config needs to be object!');
			});

			it('can inject empty object for config', function () {
				var c = {};

				module.injectConfig(c);

				assert.property(c, 'test');

				assert.isObject(module.config);
				assert.equal(c.test, module.config);

				module.config.pony = 'Twilie';
				assert.equal(c.test.pony, 'Twilie');

				c.test.pony = 'Dashie';
				assert.equal(module.config.pony, 'Dashie');
			});

			it('can inject predefined config', function () {
				module.injectConfig({
					'test': {
						'pony': 'RD'
					}
				});

				assert.isObject(module.config);
				assert.property(module.config, 'pony');
				assert.equal(module.config.pony, 'RD');
			});
		});

		describe('#injectDispatcher', function () {
			it('throws error on wrong object', function () {
				assert.throws(module.injectDispatcher.bind(module), 'Wrong dispatcher type for \'test\' module injected!');
				assert.throws(module.injectDispatcher.bind(module, {}), 'Wrong dispatcher type for \'test\' module injected!');
			});

			it('binds on injected EventEmitter', function () {
				module.injectDispatcher(new EventEmitter());

				assert.property(module, 'dispatcher');
				assert.isObject(module.dispatcher);
				assert.property(module.dispatcher, 'once');
				assert.property(module.dispatcher, 'on');
				assert.property(module.dispatcher, 'off');
				assert.property(module.dispatcher, 'emit');
				assert.property(module.dispatcher, 'clearEvents');
			});

			describe('emitting', function () {
				beforeEach(function () {
					module.injectDispatcher(new EventEmitter());
				});

				it('emits on simple emit (without module name)', function (done) {
					module.dispatcher.on('test/test', function () {
						done();
					}).emit('test');
				});

				it('emits on absolute emit (with module name)', function (done) {
					module.dispatcher.on('test/test', function () {
						done();
					}).emit('test/test');
				});

				it('removes events on #clearEvents', function (done) {
					var ran = false;
					module.dispatcher.on('test/test', function () {
						if (!ran) {
							ran = true;
							done();
							module.dispatcher.clearEvents();
							module.dispatcher.emit('test/test');
						} else {
							done(new Error('Failed to clear events!'));
						}
					});
					module.dispatcher.emit('test/test');
				});

				it('removes listener', function (done) {
					var ran = false;
					var list = function () {
						if (!ran) {
							ran = true;
							done();
							module.dispatcher.off('test/test', list);
							module.dispatcher.emit('test/test');
						} else {
							done(new Error('Failed to remove listener!'));
						}
					};
					module.dispatcher.on('test/test', list).emit('test/test');
				});

				it('emits dispatchError on error in emit callback', function (done) {
					module.dispatcher.on('dispatchError', function (err, event) {
						assert.equal(event, 'test/bad');
						assert.equal(err, 'Error: Bad pony!');
						done();
					});

					module.dispatcher.on('test/bad', function () {
						throw new Error('Bad pony!');
					}).emit('test/bad');
				});
			});
		});


		describe('#init', function () {
			it('throws error if no config or dispatcher or already loaded', function () {
				assert.throws(module.init.bind(module), 'No dispatcher given!');

				module.injectDispatcher(new EventEmitter());

				assert.throws(module.init.bind(module), 'No config given!');

				module.injectConfig({});

				module.loaded = true;

				assert.throws(module.init.bind(module), 'Module \'test\' is already loaded!');
			});

			it('throws error if syntax error in module', function () {
				module = MODULE.create('syntaxerror');
				module.injectConfig({});
				module.injectDispatcher(new EventEmitter());
				assert.throws(function () {
					module.init();
				}, 'Failed loading context of \'syntaxerror\' module! podule is not defined');
			});

			it('throws error if syntax error in module init', function () {
				module = MODULE.create('syntaxerrorinit');
				module.injectConfig({});
				module.injectDispatcher(new EventEmitter());
				assert.throws(function () {
					module.init();
				}, 'Failed loading context of \'syntaxerrorinit\' module! derp is not defined');
			});

			it('initializes module (loads context)', function () {
				module.injectConfig({});
				module.injectDispatcher(new EventEmitter());

				assert.isNull(module.context);

				assert.doesNotThrow(function () {
					module.init();
				});

				assert.isTrue(module.loaded);
				assert.isObject(module.context);
				assert.equal(module.context.test, 'Pony');
				assert.equal(module.testInit, 'Many ponies!');
			});
		});

		describe('#halt', function () {
			it('throws error if not loaded', function () {
				assert.throws(module.halt.bind(module), 'Module \'test\' is not loaded!');
			});

			it('throws error if syntax error in module halt', function () {
				module = MODULE.create('syntaxerrorhalt');
				module.injectConfig({});
				module.injectDispatcher(new EventEmitter());
				module.init();
				assert.throws(function () {
					module.halt();
				}, 'Failed unloading context of \'syntaxerrorhalt\' module! derp is not defined');
			});

			it('halts the module (unloads context)', function () {
				module.injectConfig({});
				module.injectDispatcher(new EventEmitter());
				module.init();

				assert.isObject(module.context);
				assert.isTrue(module.loaded);

				assert.doesNotThrow(function () {
					module.halt();
				});

				assert.isFalse(module.loaded);
				assert.isNull(module.context);

				assert.equal(module.testHalt, 'No ponies!');
			});

			it('cleans the events from emitter', function () {
				module.injectConfig({});
				module.injectDispatcher(new EventEmitter());
				module.init();

				//i tests event cleaning
				module.dispatcher.on('test/pony', function () {
					assert.isTrue(false, 'Derp, this one was supposed to not been called!');
				});

				module.halt();

				//try to emit this one
				module.dispatcher.emit('test/pony');
			});
		});

		describe('#reload', function () {
			beforeEach(function () {
				module.injectConfig({});
				module.injectDispatcher(new EventEmitter());
			});
			it('throws error if module not loaded', function () {
				assert.throws(module.reload.bind(module), 'Module \'test\' is not loaded!');
			});
			it('reloads the module (reloads context)', function () {
				module.init();

				assert.doesNotThrow(function () {
					module.reload();
				});

				assert.equal(module.testHalt, 'Reload No ponies!');
				assert.equal(module.testInit, 'Reload Many ponies!');
			});
		});
	});
});
