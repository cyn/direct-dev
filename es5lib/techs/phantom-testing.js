'use strict';

/**
 * phantom-testing
 * ===
 *
 * Технология принимает на вход html-файл с тестами и передает его
 * программе mocha-phantomjs. Результат в формате JSON записываеся в файл.
 *
 * **Опции**
 *
 * * *String* **target** — Результирующий таргет. По умолчанию `?.test-result.json`.
 * * *String* **js** — Зависимость от таргета сборки тестируемого js файла. По умолчанию `?.js`.
 * * *String* **testjs** — Зависимость от таргета сборки файла с тестами. По умолчанию `?.test.js`.
 * * *String* **html** — Таргет, собирающий тестовую страницу для запуска через phantomjs. По умолчанию `?.html`.
 *
 * **Пример**
 *
 * ```javascript
 *  nodeConfig.addTech(require('./enb-techs/tests/phantomjs'), {
 *      target: '?.test-result.json',
 *      js: '?.ru.js',
 *      testjs: '?.test.js',
 *      html: '?.html'
 *  });
 * ```
 */

var vow = require('vow'),
    vowFs = require('vow-fs'),
    path = require('path'),
    exec = require('child_process').exec,
    mochaPhantomjsPath = require.resolve('mocha-phantomjs-core'),
    mochaReporterPath = require.resolve('./mocha-reporters/json.js'),
    MAX_PHANTOM_INSTANCES = require('os').cpus().length,
    phantomQueue = [],
    phantomInstancesCount = 0,
    runAsync = function runAsync(cmd) {

    var deferred = vow.defer(),
        proc = exec(cmd);

    phantomInstancesCount++;

    // proc.stdout.on('data', function() {
    //    console.log(arguments);
    // });

    proc.stderr.on('data', function (err) {
        console.log('ERROR: %s', err);
    });

    proc.on('exit', function (exitCode) {
        phantomInstancesCount--;
        phantomQueue.length && phantomQueue.shift()();
        deferred.resolve(exitCode);
    });

    return deferred.promise();
};

/**
 * @type {Tech}
 */
module.exports = require('enb/lib/build-flow').create().name('phantom-testing').target('target', '?.test-result.json').dependOn('js', '?.js').dependOn('testjs', '?.test.js').dependOn('html', '?.html').defineOption('tmpTarget', '?.test-result.tmp').methods({
    resolveTargetPath: function resolveTargetPath(target) {
        var nodePath = this.node.getPath();
        var targetFileName = this.node.unmaskNodeTargetName(nodePath, target);

        return this.node.resolvePath(targetFileName);
    }
}).builder(function () {
    var sourceTargetFilePath = this.resolveTargetPath(this._html),
        tmpTargetFilePath = this.resolveTargetPath(this._tmpTarget),
        deferred = vow.defer(),
        config = JSON.stringify({
        ignoreResourceErrors: true,
        file: tmpTargetFilePath,
        settings: {
            loadImages: false,
            webSecurityEnabled: false
        }
    }),
        cmd = 'phantomjs \'' + mochaPhantomjsPath + '\' \'' + sourceTargetFilePath + '\' \'' + mochaReporterPath + '\' \'' + config + '\'';

    //console.info(`[i] Page was sent to Phantom: ${cmd}`);

    function runPhantom() {
        runAsync(cmd).then(function () {
            return vowFs.read(tmpTargetFilePath, 'utf8').fail(function () {
                return JSON.stringify({ result: { stats: { fatal: 1 } } });
            });
        }).then(deferred.resolve, deferred);
    }

    phantomInstancesCount < MAX_PHANTOM_INSTANCES ? runPhantom() : phantomQueue.push(runPhantom);

    return deferred.promise();
}).needRebuild(function () {
    return true;
}).createTech();