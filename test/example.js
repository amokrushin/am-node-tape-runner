const { exec } = require('child_process');
const path = require('path');
const async = require('async');
const test = require('tape');
const fs = require('fs');

test('flow', (t) => {
    const cwd = path.resolve(process.cwd(), 'example/flow');
    async.series([
        cb => exec('yarn', { cwd }, cb),
        cb => exec('npm test -s -- -r tape', { cwd }, cb),
        cb => fs.readFile(path.join(__dirname, 'fixture/flow.tap'), 'utf8', cb),
    ], (err, res) => {
        const [, yarnStderr] = res[0];
        const [testStdout, testStderr] = res[1];
        const expectedTap = res[2];
        t.ifError(yarnStderr, 'exec yarn ok');
        t.ifError(testStderr, 'exec npm test ok');
        t.equal(testStdout, expectedTap, 'tap output match');
        t.end();
    });
});

test('flow-runtime', (t) => {
    const cwd = path.resolve(process.cwd(), 'example/flow-runtime');
    async.series([
        cb => exec('yarn', { cwd }, cb),
        cb => exec('npm test -s -- -r tape', { cwd }, cb),
        cb => fs.readFile(path.join(__dirname, 'fixture/flow-runtime.tap'), 'utf8', cb),
    ], (err, res) => {
        const [, yarnStderr] = res[0];
        const [testStdout, testStderr] = res[1];
        const expectedTap = res[2];
        t.ifError(yarnStderr, 'exec yarn ok');
        t.ifError(testStderr, 'exec npm test ok');
        t.equal(testStdout, expectedTap, 'tap output match');
        t.end();
    });
});
