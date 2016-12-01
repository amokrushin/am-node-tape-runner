# am-node-tape-runner
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/amokrushin/am-node-tape-runner/master/LICENSE.txt)
[![Codecov](https://img.shields.io/codecov/c/github/amokrushin/am-node-tape-runner/master.svg)](https://codecov.io/github/amokrushin/am-node-tape-runner?branch=master)

Put index.js file into ./test dir
```js
require('am-node-tape-runner');
```

Then run tests with

```bash
node test
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
