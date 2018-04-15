ember-cli-tree-shaker
==============================================================================

[![Greenkeeper badge](https://badges.greenkeeper.io/kellyselden/ember-cli-tree-shaker.svg)](https://greenkeeper.io/)
[![npm version](https://badge.fury.io/js/ember-cli-tree-shaker.svg)](https://badge.fury.io/js/ember-cli-tree-shaker)
[![Build Status](https://travis-ci.org/kellyselden/ember-cli-tree-shaker.svg?branch=master)](https://travis-ci.org/kellyselden/ember-cli-tree-shaker)

This is a testbed for the new tree-shaking and code splitting work from [Kelly Selden](https://github.com/kellyselden) and [Alex Navasardyan](https://github.com/twokul). We will test things in here, and also port things from Ember CLI master so you can try them out early. This API is a work in progress, expect breaking changes (using [SemVer](https://semver.org/)). Feel free to suggest a better API. This project will eventually be deprecated when all the work makes it into a stable Ember CLI release.

So far, we have very basic tree-shaking. We use all of your app code as the entry point, and we only tree-shake the addon tree. This means that no app code is eliminated because it is all treated as "in use", and some addon may be inadvertently removed if it is not directly depended on from app code (vendor shims, container lookup, etc.). It is for this reason, we have an escape hatch defined below to manually `include` additional entry points.

Building the dependency graph takes time and isn't necessarily efficient. This will slow down your builds.

This doesn't work with Ember Engines yet. They have custom build code this project is not aware of.

This will probably break your tests, as the test code tree is not treated as an entry point.

### Highlights:

* Eliminates dead addon code
* Includes all app code
* Ignores other trees (vendor, bower_components, etc)
* Allow additional entry points
* Slows down build
* Tests will probably break
* Works with [ember-data](https://github.com/emberjs/data)
* Works with [ember-browserify](https://github.com/ef4/ember-browserify) (but doesn't tree-shake it yet)
* Doesn't work with [ember-engines](https://github.com/ember-engines/ember-engines) (yet)
* Tested on Ember CLI 3.0

### Statistics Sample

* [brand new ember app](https://github.com/ember-cli/ember-new-output)
  * modules removed: 13
* [package-hint-historic-resolver](https://github.com/kellyselden/package-hint-historic-resolver)
  * modules removed: 655
* [percy-web](https://github.com/percy/percy-web)
  * modules removed: 75
* [ghost-admin](https://github.com/TryGhost/Ghost-Admin)
  * modules removed: 75
* [travis](https://github.com/travis-ci/travis-web)
  * modules removed: 91
* [code-corps-ember](https://github.com/code-corps/code-corps-ember)
  * modules removed: 140

Installation
------------------------------------------------------------------------------

```
ember install ember-cli-tree-shaker
```


Usage
------------------------------------------------------------------------------

```js
// ember-cli-build.js

let app = new EmberApp(defaults, {
  treeShaking: {
    enabled: true,

    // optional
    include: [
      // This is where you can add additional entry points.

      // This is an example of dynamic lookup. There is no import statement, so it needs a hint to prevent removal.
      // https://github.com/poteto/ember-metrics/blob/c0fecc9e85190009d4d08d5be7db88df3e9803ea/addon/services/metrics.js#L177
      'ember-metrics/metrics-adapters/google-analytics.js',

      // This is an example of a vendor shim reaching back into the addon tree. This needs a hint to prevent removal.
      // https://github.com/simplabs/ember-test-selectors/blob/62070d20a2a50918f7cac373a3b23f8e9a94bf31/vendor/ember-test-selectors/patch-component.js#L10
      'ember-test-selectors/utils/bind-data-test-attributes.js'
    ]
  }
});
```

## Measuring Results

After enabling `treeShaking`, an `ember build` will generate additional information in the console, including the number of modules traversed and the number of dead modules found:

```bash
ember build
...
dead 115
traversed 2935
```

Also, you can compare the size of `vendor.js` before and after enabling `treeShaking`:

```bash
# Before enabling

ember build --environment production

Built project successfully. Stored in "dist/".
File sizes:
  ...
 - dist/assets/vendor.js:  3.35 MB (941.55 KB gzipped)
```

```bash
# After enabling

ember build --environment production

Built project successfully. Stored in "dist/".
File sizes:
  ...
 - dist/assets/vendor.js: 3.29 MB (930.26 KB gzipped)
```


Contributing
------------------------------------------------------------------------------

### Installation

* `git clone <repository-url>`
* `cd my-addon`
* `npm install`

### Linting

* `npm run lint:js`
* `npm run lint:js -- --fix`

### Running tests

* `ember test` – Runs the test suite on the current Ember version
* `ember test --server` – Runs the test suite in "watch mode"
* `ember try:each` – Runs the test suite against multiple Ember versions

### Running the dummy application

* `ember serve`
* Visit the dummy application at [http://localhost:4200](http://localhost:4200).

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).

License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
