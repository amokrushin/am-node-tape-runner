import test from 'tape';

test('module import', (t) => {
    t.pass('ok');
    t.end();
});

test('es2017 async/await', (t) => {
    const promiseO = new Promise(resolve => setTimeout(() => resolve('o'), 10));
    const promiseK = new Promise(resolve => setTimeout(() => resolve('k'), 10));

    async function ok() {
        return await promiseO + await promiseK;
    }

    ok().then((value) => {
        t.equal(value, 'ok', 'ok');
        t.end();
    });
});
