REPORTER = spec

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
    	--reporter $(REPORTER) \
    	./test

test-w:
	@NODE_ENV=test ./node_modules/.bin/mocha \
    	--reporter $(REPORTER) \
    	--growl \
    	--watch \
    	./test

jshint:
	@NODE_ENV=test find . -name '*.js' -print0 | xargs -0 ./node_modules/.bin/jshint

.PHONY: test test-w jshint