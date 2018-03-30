const test = require('tape');
const { fork } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const async = require('async');

const iamtestBin = path.resolve(process.cwd(), './bin/iamtest.js');
const successTestPath = path.join(__dirname, 'fixture/success.js');
const testArg = [successTestPath];

test('-r tape', (t) => {
    async.parallel({
        actual: (cb) => {
            let output = '';
            const runner = fork(iamtestBin, [...testArg, '-r', 'tape'], { silent: true });
            runner.stdout.on('data', (data) => {
                output += data.toString();
            });
            runner.on('exit', (code) => {
                t.equal(code, 0, 'exit code 0');
                cb(null, output);
            });
            runner.stderr.on('data', data => t.error(data.toString()));
        },
        expected: cb => fs.readFile(path.join(__dirname, 'fixture/success.tap'), 'utf8', cb),
    }, (err, { actual, expected }) => {
        if (err) t.ifError(err);
        t.equal(actual, expected, 'output');
        t.end();
    });
});

test('-r silent', (t) => {
    async.parallel({
        actual: (cb) => {
            let output = '';
            const runner = fork(iamtestBin, [...testArg, '-r', 'silent'], { silent: true });
            runner.stdout.on('data', (data) => {
                output += data.toString();
            });
            runner.on('exit', (code) => {
                t.equal(code, 0, 'exit code 0');
                cb(null, output);
            });
            runner.stderr.on('data', data => t.error(data.toString()));
        },
        expected: cb => cb(null, ''),
    }, (err, { actual, expected }) => {
        if (err) t.ifError(err);
        t.equal(actual, expected, 'output');
        t.end();
    });
});
