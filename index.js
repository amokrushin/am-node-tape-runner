const _ = require('lodash');
const async = require('async');
const minimatch = require('minimatch');
const fs = require('fs-extra');
const chalk = require('chalk');
const path = require('path');
const { fork } = require('child_process');
const { PassThrough } = require('stream');

const nycPath = path.resolve(__dirname, './node_modules/nyc/bin/nyc.js');
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
            choices: ['dots', 'spec', 'summary', 'tape'],
            describe: 'coverage report',
            default: 'dots',
        },
        c: {
            alias: 'coverage',
            choices: ['text', 'html'],
            describe: 'coverage report',
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
    })
    .argv;

const isMaster = !argv.child;
const isSummary = !argv._.length;
const ignorePath = ['mock/*', 'resources/*', 'skip/*', 'util/*', 'index.js'];
const filterPath = _.map(argv._, v => v.replace(`${rootPath}/`, '').replace('./test/', ''));

function relativePath(p) {
    return p.replace(`${rootPath}/`, '');
}

const verbose = argv.verbose
    ? (...args) => process.stdout.write(`${chalk.cyan(args[0])}\n${args.slice(1).join('')}`)
    : () => {};

function tapeReporterStream() {
    // eslint-disable-next-line global-require
    if (argv.reporter === 'spec') return require('tap-spec')();
    // eslint-disable-next-line global-require
    if (argv.reporter === 'summary') return require('tap-summary')({ ansi: true, progress: true });
    // eslint-disable-next-line global-require, import/newline-after-import
    if (argv.reporter === 'dots') return require('am-tap-dot').amTapDot();
    if (argv.reporter === 'tape') return new PassThrough();
    throw new Error('invalid reporter value');
}

function getTestFiles() {
    return fs.walkSync(rootPath).filter(filepath => {
        const p = relativePath(filepath);
        if (minimatch(p, '!*.js', { matchBase: true })) return false;
        if (_.some(ignorePath, v => minimatch(p, v))) return false;
        if (filterPath.length && !_.some(filterPath, v => minimatch(p, v))) return false;
        return true;
    });
}

function getCoverageFiles() {
    const report = fs.readJsonSync(path.resolve(rootPath, '../coverage/coverage-summary.json'));
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
        process.stdout.write('  \n');
        process.stdout.write(`  View coverage report at ${chalk.cyan(`http://localhost:${server.port}`)}\n`);
        process.stdout.write('  Press ctrl+c to exit...\n');
    });
}

function filterChildArgs(args) {
    return _.pull(args, '-w', '--watch', '--web');
}

function runWatcher(args) {
    let child = new Child(null, [], { verbose });
    const watcher = new Watcher({ verbose });
    watcher
        .watch(_.concat(getTestFiles(), getCoverageFiles()))
        .on('change', () => {
            child.kill();
        })
        .on('debounce', () => {
            child.exit().then(() => {
                child = new Child(nycPath, filterChildArgs(args), { verbose });
                child.process.once('exit', () => {
                    watcher.watch(_.concat(getTestFiles(), getCoverageFiles()));
                });
            });
        });
}

function runTest() {
    const reporter = tapeReporterStream();
    reporter.pipe(process.stdout);
    const testFiles = getTestFiles();
    async.eachSeries(testFiles, (filePath, cb) => {
        const sof = filePath === testFiles[0] ? '\n ' : '\n\n ';
        const eof = filePath === testFiles[0] ? '' : '\n';
        const header = chalk.bgWhite.black(` ${_.padEnd(relativePath(filePath), 80, ' ')}`);
        const child = fork(filePath, [], { silent: true });
        process.stdout.write(`${sof}${header}${eof}`);
        reporter.emit('dot-line-break');
        child.stdout.on('data', data => {
            reporter.write(data.toString());
        });
        child.on('exit', () => cb());
        child.stdout.on('end', () => {});
        child.stderr.pipe(process.stderr);
    }, () => {
        reporter.end();
    });
}

if (isMaster) {
    verbose('TEST FILES', getTestFiles().map(f => `  ${f}\n`).join(''));
}

if ((argv.coverage || argv.watch) && isMaster) {
    const args = ['--reporter=json-summary', 'node', __filename].concat(process.argv.slice(2), '--child');
    if (argv.coverage === 'html') {
        args.unshift('--reporter=html');
    }
    if (argv.coverage) {
        if (isSummary) {
            args.unshift('--reporter=text-summary');
        }
        args.unshift('--reporter=text');
    }
    const test = fork(nycPath, args, { stdio: 'inherit' });
    test.on('exit', () => {
        if (argv.coverage === 'html' && argv.web) {
            serveCoverageHtml(argv.web);
        }
        if (argv.watch) {
            runWatcher(args);
        }
    });
} else {
    runTest();
}
