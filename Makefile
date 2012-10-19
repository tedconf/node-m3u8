REPORTER = list

test:
	./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		test/*.js test/acceptance/*.js

test-acceptance:
	./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		test/acceptance/*.js

.PHONY: test test-acceptance