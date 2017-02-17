const _ = require('lodash');
const async = require('async');
const minimatch = require('minimatch');
const fs = require('fs-extra');
const chalk = require('chalk');
const path = require('path');
const { fork } = require('child_process');
const { PassThrough } = require('stream');
const debug = require('util').debuglog('am-node-tape-runner');

const nycPath = require.resolve('nyc/bin/nyc.js');
const rootPath = path.join(process.cwd(), '/test');

const Child = require('./lib/Child');
const Watcher = require('./lib/Watcher');

// lazy load
// const tapSpec = require('tap-spec');
// const tapSummary = require('tap-summary');
// const { amTapDot } = require('am-tap-dot');
// const StaticServer = require('static-server');

const argv = require('yargs')
    .options({
        r: {
            alias: 'reporter',
            choices: ['dots', 'spec', 'summary', 'tape', 'silent'],
            describe: 'test reporter',
            default: 'dots',
        },
        c: {
            alias: 'coverage',
            choices: ['console', 'html', 'json', 'json-summary', 'lcov', 'lcovonly',
                'text', 'text-lcov', 'text-summary'],
            describe: 'coverage reporter',
        },
        web: {
            describe: 'web server for coverage report',
            type: 'number',
            nargs: 1,
        },
        w: {
            alias: 'watch',
            describe: 'watch for changes',
            boolean: true,
        },
        child: {
            describe: 'child process',
            boolean: true,
        },
        verbose: {
            describe: 'debug log',
            boolean: true,
        },
        h: { alias: 'help' },
        coverageDir: {
            describe: 'see nyc --report-dir',
            type: 'string',
            nargs: 1,
        },
    })
    .implies('web', 'coverage')
    .check((a) => {
        if (a.web && !_.castArray(a.coverage).includes('html')) {
            throw new Error('Implications failed:\n web -> coverage html');
        }
        return true;
    })
    .epilogue('For more information see https://github.com/amokrushin/stream-zip')
    .help()
    .argv;

const isMaster = !argv.child;
const ignorePath = ['mock/*', 'resources/*', 'skip/*', 'util/*', 'index.js'];
const filterPath = _.map(argv._, v => v.replace(`${rootPath}/`, '').replace('./test/', ''));
const isSilent = argv.reporter === 'silent';

debug('START', `reporter: ${argv.reporter}`);

function ipcSend(message) {
    if (process.send) process.send(message);
}

function relativePath(p) {
    return p.replace(`${rootPath}/`, '');
}

function outputWrite(str) {
    if (!isSilent) {
        process.stdout.write(str);
    }
}

const verbose = argv.verbose
    ? (...args) => outputWrite(`${chalk.cyan(args[0])}\n${args.slice(1).join('')}`)
    : () => {};

function tapeReporterStream() {
    // eslint-disable-next-line global-require
    if (argv.reporter === 'spec') return require('tap-spec')();
    // eslint-disable-next-line global-require
    if (argv.reporter === 'summary') return require('tap-summary')({ ansi: true, progress: true });
    // eslint-disable-next-line global-require, import/newline-after-import
    if (argv.reporter === 'dots') return require('am-tap-dot').amTapDot();
    if (argv.reporter === 'tape') return new PassThrough();
    if (argv.reporter === 'silent') return new PassThrough();
    /* istanbul ignore next */
    throw new Error('invalid reporter value');
}

function getTestFiles() {
    return fs.walkSync(rootPath).filter((filepath) => {
        const p = relativePath(filepath);
        if (minimatch(p, '!*.js', { matchBase: true })) return false;
        if (_.some(ignorePath, v => minimatch(p, v))) return false;
        if (filterPath.length && !_.some(filterPath, v => minimatch(p, v))) return false;
        return true;
    });
}

function getCoverageFiles() {
    const coverageDir = argv.coverageDir || path.resolve(rootPath, '../coverage');
    const report = fs.readJsonSync(path.join(coverageDir, 'coverage-summary.json'));
    return _.pull(_.keys(report), 'total');
}

function serveCoverageHtml(port) {
    // eslint-disable-next-line global-require
    const StaticServer = require('static-server');

    const server = new StaticServer({
        rootPath: path.resolve(rootPath, '../coverage'),
        name: 'Coverage Report',
        port,
    });
    server.start(() => {
        outputWrite('  \n');
        outputWrite(`  View coverage report at ${chalk.cyan(`http://localhost:${server.port}`)}\n`);
        outputWrite('  Press ctrl+c to exit...\n');
    });
}

function filterChildArgs(args) {
    const _args = _.clone(args);
    const ix = _args.indexOf('--web');
    if (_args.includes('--web')) {
        _args.splice(ix, 2);
    }
    _.pull(_args, '-w', '--watch');
    ipcSend({ name: 'filter', body: _args });
    return _args;
}

function runWatcher(args) {
    let child = new Child(null, [], { verbose });
    const watcher = new Watcher({ verbose });
    const watchingFiles = _.concat(getTestFiles(), getCoverageFiles());
    const _args = filterChildArgs(args);
    watcher
        .watch(watchingFiles)
        .on('change', () => {
            ipcSend({ name: 'watcher event' });
            child.kill();
        })
        .on('debounce', () => {
            child.exit().then(() => {
                child = new Child(nycPath, _args, { verbose });
                ipcSend({ name: 'child fork', body: { id: child.id, script: nycPath, args: _args } });
                child.process.once('exit', () => {
                    ipcSend({ name: 'child exit', body: { id: child.id } });
                    // child.process.removeAllListeners();
                    watcher.watch(_.concat(getTestFiles(), getCoverageFiles()));
                });
                // bubble child message
                child.process.on('message', (message) => {
                    ipcSend(message);
                });
                // child.process.on('error', message => ipcSend(message));
            });
        });
    process.nextTick(() => {
        ipcSend({ name: 'run watcher', body: watchingFiles });
    });
}

function outputFilenameHeader(filePath, isFirst) {
    let filenameHeader = '';
    if (argv.reporter === 'tape') {
        const sof = isFirst ? '#\n#' : '\n#\n#';
        const eof = '\n#\n';
        const header = relativePath(filePath);
        filenameHeader = `${sof}${header}${eof}`;
    } else if (argv.reporter === 'dots') {
        const sof = isFirst ? '\n ' : '\n\n ';
        const eof = isFirst ? '' : '\n';
        const header = chalk.bgWhite.black(` ${_.padEnd(relativePath(filePath), 80, ' ')}`);
        filenameHeader = `${sof}${header}${eof}`;
    } else if (!isSilent) {
        const sof = isFirst ? '\n ' : '\n\n ';
        const eof = isFirst ? '\n' : '\n';
        const header = chalk.bgWhite.black(` ${_.padEnd(relativePath(filePath), 80, ' ')}`);
        filenameHeader = `${sof}${header}${eof}`;
    }
    return filenameHeader;
}

function runTest() {
    const reporter = tapeReporterStream();
    if (!isSilent) {
        reporter.pipe(process.stdout);
    }
    const testFiles = getTestFiles();
    debug('TEST FILES', `\n  • ${testFiles.join('\n  • ')}\n`);
    async.eachSeries(testFiles, (filePath, cb) => {
        const child = fork(filePath, [], { silent: true });
        outputWrite(outputFilenameHeader(filePath, filePath === testFiles[0]));
        reporter.emit('dot-line-break');
        child.stdout.on('data', (data) => {
            reporter.write(data.toString());
        });
        child.once('exit', () => cb());
        child.stdout.on('end', () => {});
        child.stderr.pipe(process.stderr);
        child.once('error', err => ipcSend({ name: 'error', body: err }));
    }, () => {
        reporter.end();
    });
}

ipcSend({ name: 'start', body: argv });

if (isMaster) {
    verbose('TEST FILES', getTestFiles().map(f => `  ${f}\n`).join(''));
}

if ((argv.coverage || argv.watch) && isMaster) {
    ipcSend({ name: 'run master' });
    const args = ['node', __filename].concat(process.argv.slice(2), '--child');
    if (argv.coverage) {
        const reporters = [];
        if (_.castArray(argv.coverage).includes('console')) {
            reporters.push('text', 'text-summary');
        }
        if (_.isArray(argv.coverage)) {
            reporters.push(..._.without(argv.coverage, 'console'));
            // Array.prototype.push.apply(reporters, _.without(argv.coverage, 'console'));
        } else if (argv.coverage !== 'console') {
            reporters.push(argv.coverage);
        }
        if (argv.watch) {
            reporters.push('json-summary');
        }
        _.uniq(reporters).reverse().forEach(reporter => args.unshift(`--reporter=${reporter}`));
    } else if (argv.watch) {
        args.unshift('--reporter=json-summary');
    }

    if (argv.coverageDir) {
        args.unshift(`--report-dir=${argv.coverageDir}`);
    }

    ipcSend({ name: 'run nyc', body: args });

    const test = fork(nycPath, args, { stdio: 'inherit' });
    test.on('exit', () => {
        if (argv.web && _.castArray(argv.coverage).includes('html')) {
            serveCoverageHtml(argv.web);
        }
        if (argv.watch) {
            runWatcher(args);
        }
    });
    // bubble child message
    test.on('message', (message) => {
        ipcSend(message);
    });
    test.on('error', err => ipcSend({ name: 'error', body: err }));
} else {
    debug('RUN TESTS');
    ipcSend({ name: 'run test' });
    runTest();
}
