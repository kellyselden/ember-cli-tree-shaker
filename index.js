'use strict';

const concat = require('broccoli-concat');
const mergeTrees = require('broccoli-merge-trees');
const BroccoliDebug = require('broccoli-debug');
const Funnel = require('broccoli-funnel');
const Graph = require('ember-cli-dependency-graph');
 // eslint-disable-next-line node/no-unpublished-require
const EmberApp = require('ember-cli/lib/broccoli/ember-app');

const DEFAULT_CONFIG = {
  storeConfigInMeta: true,
  autoRun: true,
  outputPaths: {
    app: {
      html: 'index.html',
    },
    tests: {
      js: '/assets/tests.js',
    },
    vendor: {
      css: '/assets/vendor.css',
      js: '/assets/vendor.js',
    },
    testSupport: {
      css: '/assets/test-support.css',
      js: {
        testSupport: '/assets/test-support.js',
        testLoader: '/assets/test-loader.js',
      },
    },
  },
  minifyCSS: {
    options: { relativeTo: 'assets' },
  },
  sourcemaps: {},
  trees: {},
  jshintrc: {},
  addons: {},
};

class Exclude extends Funnel {
  constructor(inputNode, options) {
    super(inputNode, {
      exclude: [],
    });

    this.options = options;
  }

  build() {
    let inputPath = this.inputPaths[0];

    this.exclude = this.options.exclude(inputPath);

    super.build();
  }
}

class ConcatenationStrategy {
  constructor(options) {
    this.options = options;
  }

  toTree(assembler, inputTree) {
    let tree = inputTree;

    let treeShaking = this.options.treeShaking || {};
    if (treeShaking.enabled) {
      let name = this.options.name;
      tree = new Exclude(tree, {
        exclude(inputPath) {
          let graph = Graph.build(inputPath, name, {
            include: treeShaking.include,
          });

          let dead = graph.calculateDead();

          /* eslint-disable no-console */
          dead.forEach(x => console.log(x));
          console.log('dead', dead.length);
          console.log('traversed', graph.flattened.length);
          /* eslint-enable no-console */

          return dead;
        },
      });
    }

    return concat(tree, this.options);
  }
}

function getVendorFiles(files, isMainVendorFile) {
  return {
    headerFiles: files,
    inputFiles: isMainVendorFile ? ['addon-tree-output/**/*.js'] : [],
    footerFiles: isMainVendorFile ? ['vendor/ember-cli/vendor-suffix.js'] : [],
  };
}

function createVendorJsStrategy(options) {
  const vendorObject = getVendorFiles(options.files, options.isMainVendorFile);

  return new ConcatenationStrategy({
    name: options.name,
    inputFiles: vendorObject.inputFiles,
    headerFiles: vendorObject.headerFiles,
    footerFiles: vendorObject.footerFiles,
    outputFile: options.outputFile,
    annotation: options.annotation,
    separator: '\n;',
    sourceMapConfig: options.sourceMapConfig,
    treeShaking: options.treeShaking,
  });
}

function createApplicationJsStrategy(options) {
  return new ConcatenationStrategy({
    inputFiles: [`${options.name}/**/*.js`],
    headerFiles: [
      'vendor/ember-cli/app-prefix.js',
    ],
    footerFiles: [
      'vendor/ember-cli/app-suffix.js',
      'vendor/ember-cli/app-config.js',
      'vendor/ember-cli/app-boot.js',
    ],
    outputFile: options.outputFile,
    annotation: options.annotation,
    sourceMapConfig: options.sourceMapConfig,
  });
}

function isBroccoliTree(tree) {
  return typeof tree.rebuild === 'function' || tree._inputNodes !== undefined;
}

class Assembler {
  constructor(inputTree, _options) {
    this._debugTree = BroccoliDebug.buildDebugCallback('assembler');
    const options = _options || {};

    if (inputTree === undefined) {
      throw new Error('You have to pass a broccoli tree in.');
    }

    this.inputTree = this._debugTree(inputTree, 'js:input');
    this.strategies = options.strategies || [];
    this.annotation = options.annotation || '';
  }

  toTree() {
    const strategies = this.strategies;

    if (strategies === undefined || strategies.length === 0) {
      return this.inputTree;
    }

    const treeList = strategies
      .map(strategy => {
        if (strategy.toTree === undefined) {
          throw new Error('Strategy has to define `toTree` method.');
        }

        if (typeof strategy.toTree !== 'function') {
          throw new Error('`toTree` needs to be a function.');
        }

        const tree = strategy.toTree(this, this.inputTree);

        if (tree === undefined || tree === null || !isBroccoliTree(tree)) {
          throw new Error('`toTree` has to return a broccoli tree.');
        }

        return tree;
      });

    return this._debugTree(mergeTrees(treeList, {
      annotation: this.annotation,
    }), 'js:output');
  }
}

EmberApp.prototype.javascript = function() {
  let deprecate = this.project.ui.writeDeprecateLine.bind(this.project.ui);
  let applicationJs = this.appAndDependencies();

  if (this.legacyFilesToAppend.length > 0) {
    deprecate(`Usage of EmberApp.legacyFilesToAppend is deprecated. ` +
      `Please use EmberApp.import instead for the following files: '${this.legacyFilesToAppend.join('\', \'')}'`);

    this.legacyFilesToAppend.forEach(legacyFile => {
      this.import(legacyFile);
    });
  }

  let appFilePath = this.options.outputPaths.app.js;
  let vendorFilePath = this.options.outputPaths.vendor.js;

  this._scriptOutputFiles[vendorFilePath].unshift('vendor/ember-cli/vendor-prefix.js');

  let strategies = [createApplicationJsStrategy({
    name: this.name,
    outputFile: appFilePath,
    sourceMapConfig: this.options.sourcemaps,
    annotation: 'Concat App',
  })];
  let importPaths = Object.keys(this._scriptOutputFiles);

  // iterate over the keys and create N strategies
  // to support scenarios like
  // app.import('vendor/foobar.js', { outputFile: 'assets/baz.js' });
  importPaths.forEach(importPath => {
    strategies.push(createVendorJsStrategy({
      name: this.name,
      files: this._scriptOutputFiles[importPath],
      isMainVendorFile: importPath === DEFAULT_CONFIG.outputPaths.vendor.js,
      outputFile: importPath,
      sourceMapConfig: this.options.sourcemaps,
      treeShaking: this.options.treeShaking,
      annotation: 'Vendor JS',
    }));
  });

  let assembler = new Assembler(applicationJs, {
    annotation: 'Assembler (vendor & appJS)',
    strategies,
  });

  return assembler.toTree();
};

module.exports = {
  name: 'ember-cli-tree-shaker'
};
