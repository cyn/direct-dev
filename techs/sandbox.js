'use strict';

/**
 * sandbox
 * ===
 *
 * Собирает бандл для песочницы. Включает туда содержимое файлов .sandbox.js, обернутое
 * в служебный код песочницы.
 *
 * **Опции**
 *
 * * *String* [target] — Результирующий таргет. По умолчанию `?.sandbox.js`.
 * * *BlockFilter* [filter] — Фильтр по названию блока и уровням переопределения. По умолчанию - не указан.
 *
 * **Пример**
 *
 * ```javascript
 *
 *  const techs = require('direct-dev').techs;
 *
 *  const filter = new BlockFilter(
 *      { targetBlock: 'block-name', targetLevels: ['source.blocks'] },
 *      { rootPath: config.getRootPath() }
 *  );
 *
 *  nodeConfig.addTech(techs.devPageBemjson, { target: '?.sandbox.js' });
 * ```
 */

const util = require('util');
const vow = require('vow');
const vowFs = require('vow-fs');
const BlockFilter = require('../lib/block-filter');

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



