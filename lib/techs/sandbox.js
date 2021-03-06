'use strict';

/** [sandbox](https://github.com/direct-adv-interfaces/direct-dev/TECHS.md#sandbox) */

const util = require('util');
const require2 = require('../utils/require2');
const vow = require2('enb/node_modules/vow', 'vow');
const vowFs = require2('enb/node_modules/vow-fs', 'vow-fs');
const BlockFilter = require('../utils/block-filter');

module.exports = require('enb/lib/build-flow').create()
    .name('sandbox')
    .target('target', '?.sandbox.js')
    .defineOption('filter')
    .useFileList('sandbox.js')
    .builder(function(paths) {
        const node = this.node;
        const filter = this.getOption('filter', BlockFilter.empty);

        return vow.all(paths.filter(filter.enb).map(function(file) {
            return vowFs.read(file.fullname, 'utf8').then(function(data) {

                var filename = node.relativePath(file.fullname),
                    src =  util.format('(function(window) {' +
                        'var module = { exports: {} }, exports = module.exports; %s;' +
                        '!window.SANDBOX && (window.SANDBOX = {});' +
                        '!window.SANDBOX.blocks && (window.SANDBOX.blocks = []);' +
                        'window.SANDBOX.blocks.push(module.exports);' +
                    '})(window);', data);

                return '/* begin: ' + filename + ' *' + '/\n' + src + '\n/* end: ' + filename + ' *' + '/';
            });
        })).then(function(contents) {
            return contents.join('\n');
        });
    })
    .createTech();



