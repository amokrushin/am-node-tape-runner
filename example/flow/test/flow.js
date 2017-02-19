// @flow
const test = require('tape');

const add = (a: number, b: number): number => a + b;

test('ok', (t) => {
    t.equal(add(1, 2), 3);
    t.end();
});
