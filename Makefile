#!/usr/bin/env make

EXPECTED_NODE_VERSION := $(file < .nvmrc)
NODE_VERSION := $(shell node --version || echo "Getting node version failed with $$?")

# is available node version the expected one ? 
ifneq ($(EXPECTED_NODE_VERSION), $(NODE_VERSION)) 
$(error Expected Node version "$(EXPECTED_NODE_VERSION)" not installed (detected version: "$(NODE_VERSION)"))
endif

# is npm available ? 
ifeq (,$(shell which npm))
$(error 'Could not find npm')
endif

# add node_modules/.bin to PATH environment 
PATH := $(shell npm bin):${PATH}

.PHONY : all 
all: transpile ## (default) builds the project

node_modules: package-lock.json
	npm -q  --no-fund ci
# fixes repeated installation of node_modules again and again 
# (https://gist.github.com/hallettj/29b8e7815b264c88a0a0ee9dcddb6210)
	@touch -m node_modules
	

package-lock.json: 
	npm install --no-fund --package-lock-only

dist/%.js : src/%.mjs
# create variable at execution time : see https://stackoverflow.com/questions/1909188/define-make-variable-at-rule-execution-time
	$(eval $@_GLOBAL_NAME := $(basename $(notdir $@)))
# development version
	bin/esbuild-bundle.mjs --debug --global-name='$($@_GLOBAL_NAME)' $< $@
# production version
	bin/esbuild-bundle.mjs --global-name='$($@_GLOBAL_NAME)' $< $(@:.js=-min.js)

# watch/rebuild mjs/scss files 
.PHONY : transpile 
transpile: node_modules dist/example.js

.PHONY : dev
dev: all ## build mjs/scss sources on change
	find src/ -type f | \
	entr -c -r -d /usr/bin/env bash -c "make -B transpile"

.PHONY : clean
clean: ## cleanup files/dirs created by build targets
# remove everything matching .gitignore entries (-f is force, you can add -q to suppress command output, exclude node_modules and node_modules/**)
	git clean -Xffd \
		-e '!/node_modules/' -e '!/node_modules/**'

# https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
.PHONY: help
help: ## prints this screen
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# Delete all files in the current directory (or created by this makefile) that are created by configuring or building the program.
# see https://www.gnu.org/software/make/manual/html_node/Standard-Targets.html 
.PHONY : distclean
distclean: clean ## clean + removes node_modules/ and package-lock.json
	rm -rf node_modules package-lock.json
