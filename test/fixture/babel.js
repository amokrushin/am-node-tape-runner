import test from 'tape-async';
import Baz, { foo, bar } from './es6-export';
import Foo from './es6-async-await';

test('es6 import', (t) => {
    t.pass('ok');
    t.end();
});

test('es6 export', (t) => {
    t.equal(foo, 42, 'export const');
    t.equal(bar(), 42, 'export function');
    t.equal(new Baz().test(), 42, 'export default class');
    t.end();
});

test('es6 async/await', async (t) => {
    t.equal(await (new Foo().test()), 42, 'export default class');
    t.end();
});
