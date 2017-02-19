// @flow
import test from 'tape';
import 'flow-runtime';

const add = (a: number, b: number): number => a + b;

test('ok', (t) => {
    t.doesNotThrow(() => {
        t.equal(add(1, 2), 3);
    });
    t.end();
});

test('runtime error', (t) => {
    t.throws(() => {
        // flow-disable-next-line
        t.equal(add(1, false), 1);
    });
    t.end();
});
