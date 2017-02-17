# am-node-tape-runner
[![Latest Stable Version](https://img.shields.io/npm/v/am-node-tape-runner.svg)](https://www.npmjs.com/package/am-node-tape-runner)
[![Build Status](https://img.shields.io/travis/amokrushin/am-node-tape-runner/master.svg)](https://travis-ci.org/amokrushin/am-node-tape-runner)
[![Test Coverage](https://img.shields.io/codecov/c/github/amokrushin/am-node-tape-runner/master.svg)](https://codecov.io/github/amokrushin/am-node-tape-runner?branch=master)
[![Dependency Status](https://img.shields.io/david/amokrushin/am-node-tape-runner.svg)](https://david-dm.org/amokrushin/am-node-tape-runner)
[![License](https://img.shields.io/npm/l/am-node-tape-runner.svg)](https://raw.githubusercontent.com/amokrushin/am-node-tape-runner/master/LICENSE.txt)

## Installation
```js
# with npm
$ npm i am-node-tape-runner -D

# with yarn
$ yarn add am-node-tape-runner -D
```

## Usage

global
```bash
$ iamtest
```
local
```bash
$ node_modules/.bin/iamtest
```
package.json
```json
{
  "script": {
    "test": "iamtest"
  }
}
```

```bash
Options:
  -r, --reporter  test reporter
        [choices: "dots", "spec", "summary", "tape", "silent"] [default: "dots"]
  -c, --coverage  coverage reporter
        [choices: "console", "html", "json", "json-summary", "lcov", "lcovonly",
        "text", "text-lcov", "text-summary"]
  --web           web server for coverage report                        [number]
  -w, --watch     watch for changes                                    [boolean]
  --child         child process                                        [boolean]
  --verbose       debug log                                            [boolean]
  --coverageDir   see nyc --report-dir                                  [string]
  -h, --help      Show help                                            [boolean]
```

## Example
package.json
```json
{
  "script": {
    "test": "iamtest",
    "test:unit": "iamtest ./test/unit/*",
    "codecov": "iamtest ./test/unit/* -c lcovonly && codecov"
  }
}
```
