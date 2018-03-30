const delay = timeout => new Promise(resolve => setTimeout(resolve, timeout));

export default class Foo {
    async foo() {
        const a = 10.5;
        const b = 10.5;
        await delay(10);
        return a + b;
    }

    async bar() {
        const a = 10.5;
        const b = 10.5;
        await delay(10);
        return a + b;
    }

    async test() {
        const a = await this.foo();
        const b = await this.bar();
        return Math.round(a + b);
    }
}
