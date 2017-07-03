# Mail Proxy Web Extension client

## Usage

First, install all [NodeJS][nodejs] dependencies with [npm](http://npmjs.com/):

    npm install


Build extension for Chrome/Opera:

    gulp crx [--debug]

Build extension for Firefox:

    gulp xpi [--debug]

Build all parts:

    gulp build [--debug]

* `--debug` - Non-minified build, including .map files, directed to testing popup content

Run unit-tests

    gulp test
    npm run coverage

Run syntax checker

    gulp lint


[react]: https://facebook.github.io/react/
[nodejs]: https://nodejs.org/en/
[npm]: http://npmjs.com/
