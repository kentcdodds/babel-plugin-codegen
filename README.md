<div align="center">
<h1>babel-plugin-codegen 💥</h1>

<p>Generate code at build-time</p>
</div>

<hr />

<!-- prettier-ignore-start -->
[![Build Status][build-badge]][build]
[![Code Coverage][coverage-badge]][coverage]
[![version][version-badge]][package]
[![downloads][downloads-badge]][npmtrends]
[![MIT License][license-badge]][license]

[![All Contributors](https://img.shields.io/badge/all_contributors-4-orange.svg?style=flat-square)](#contributors)
[![PRs Welcome][prs-badge]][prs]
[![Code of Conduct][coc-badge]][coc]
[![Babel Macro](https://img.shields.io/badge/babel--macro-%F0%9F%8E%A3-f5da55.svg?style=flat-square)](https://github.com/kentcdodds/babel-plugin-macros)
<!-- prettier-ignore-end -->

## The problem

The applications of this plugin are wide, so it's kinda hard to sum it up, but
basically my use case was I needed to add a bunch of named exports to
[`glamorous`][glamorous] (one for every DOM node type) and I didn't want to
maintain the exports in my source file. So someone created a post-build script
to concatenate them to the end of the file. I built this plugin so I could do
that without having an ad-hoc post-build script.

> Read
> ["Make maintainable workarounds with codegen 💥"](https://blog.kentcdodds.com/make-maintainable-workarounds-with-codegen-d34163a09c13)
> for more inspiration

## This solution

This plugin allows you to generate code at build-time. Any code that runs
synchronously in node can be used to generate a string of code and that string
will be inserted in place of where your usage appears.

It works by accepting your code string (or module when using the `// @codegen`
comment directive) and requiring it as a module. Then it takes whatever the
export was (which should be a string) and converts that string to an AST node
and swaps your usage node with the new AST node.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Installation](#installation)
- [Usage](#usage)
  - [Template Tag](#template-tag)
  - [import comment](#import-comment)
  - [codegen.require](#codegenrequire)
  - [codegen file comment (`// @codegen`)](#codegen-file-comment--codegen)
- [Configure with Babel](#configure-with-babel)
  - [Via `.babelrc` (Recommended)](#via-babelrc-recommended)
  - [Via CLI](#via-cli)
  - [Via Node API](#via-node-api)
- [Use with `babel-plugin-macros`](#use-with-babel-plugin-macros)
  - [APIs not supported by the macro](#apis-not-supported-by-the-macro)
- [Caveats](#caveats)
- [Examples](#examples)
- [Inspiration](#inspiration)
- [Other Solutions](#other-solutions)
- [Contributors](#contributors)
- [LICENSE](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation

This module is distributed via [npm][npm] which is bundled with [node][node] and
should be installed as one of your project's `devDependencies`:

```
npm install --save-dev babel-plugin-codegen
```

## Usage

This package works in a very similar way to [`babel-plugin-preval`][preval]
except in this case instead of any value being replaced in the code, you're
actually replacing it with code (giving you a little bit more power in exchange
for potentially being a little more confusing).

Important notes:

1.  All code run by `codegen` is _not_ run in a sandboxed environment
2.  All code _must_ run synchronously.

> You may like to watch
> [this YouTube video](https://www.youtube.com/watch?v=1queadQ0048&list=PLV5CVI1eNcJgCrPH_e6d57KRUTiDZgs0u)
> to get an idea of what codegen is and how it can be used.

### Template Tag

**Before**:

```javascript
codegen`
  const fs = require('fs')
  module.exports = fs.readFileSync(require.resolve('./some-code.js'), 'utf8')
`
```

**After** (assuming `some-code.js` contains the text: `var x = 'Hello world!'`):

```javascript
var x = 'Hello world!'
```

`codegen` can also handle _some_ simple dynamic values as well:

**Before**:

```javascript
const three = 3
const x = codegen`module.exports = '${three}'`
```

**After**:

```javascript
const three = 3
const x = 3
```

### import comment

**Before**:

```javascript
import /* codegen */ './assign-one.js'
```

**After** (`assign-one.js` is: `module.exports = 'var x = 1'`):

```javascript
var x = 1
```

You can also provide arguments! In this case, the module you import should
export a function which accepts those arguments and returns a string.

**Before**:

```javascript
import /* codegen(3) */ './assign-identity'
```

**After** (`assign-identity.js` is:
`module.exports = input => 'var x = ' + JSON.stringify(input) + ';'`):

```javascript
var x = 3
```

### codegen.require

**Before**:

```javascript
const x = codegen.require('./es6-identity', 3)
```

**After** (`es6-identity.js` is:
`export default input => 'var x = ' + JSON.stringify(input) + ';'`):

```javascript
const x = 3
```

### codegen file comment (`// @codegen`)

Using the codegen file comment will update a whole file to be evaluated down to
an export.

Whereas the above usages (assignment/import/require) will only codegen the scope
of the assignment or file being imported.

**Before**:

```javascript
// @codegen
const array = ['apple', 'orange', 'pear']
module.exports = array
  .map(fruit => `export const ${fruit} = '${fruit}';`)
  .join('')
```

**After**:

```javascript
export const apple = 'apple'
export const orange = 'orange'
export const pear = 'pear'
```

## Configure with Babel

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["codegen"]
}
```

### Via CLI

```sh
babel --plugins codegen script.js
```

### Via Node API

```javascript
require('babel-core').transform('code', {
  plugins: ['codegen'],
})
```

## Use with `babel-plugin-macros`

Once you've
[configured `babel-plugin-macros`](https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/user.md)
you can import/require the codegen macro at `babel-plugin-codegen/macro`. For
example:

```javascript
import codegen from 'babel-plugin-codegen/macro'

codegen`module.exports = ['a', 'b', 'c'].map(l => 'export const ' + l + ' = ' + JSON.stringify(l)).join(';')`

      ↓ ↓ ↓ ↓ ↓ ↓

export const a = "a";
export const b = "b";
export const c = "c";
```

### APIs not supported by the macro

- [file comment (`// @codegen`)](#codegen-file-comment--codegen)
- [import comment](#import-comment)

> You could also use [`codegen.macro`][codegen.macro] if you'd prefer to type
> less 😀

## Caveats

One really important thing to note here is that it doesn't work by simply
replacing your code with whatever string you export. Instead it replaces it at
the AST level. This means that the resulting code should operate the same, but
the format of the code could be entirely different. Most of the time this should
not matter, but if it matters to you, please feel free to contribute back if you
feel like you could make it work!

## Examples

- [Using babel macros with React Native](https://bit.ly/babel-codegen): A
  practical use case for solving an i18n problem using
  [`codegen.macro`](https://www.npmjs.com/package/codegen.macro)

## Inspiration

I built this to solve a problem I was experiencing with [glamorous][glamorous].
It's heavily based on my work in [babel-plugin-preval][preval].

## Other Solutions

I'm not aware of any, if you are please [make a pull request][prs] and add it
here!

## Contributors

Thanks goes to these people ([emoji key][emojis]):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
| [<img src="https://avatars.githubusercontent.com/u/1500684?v=3" width="100px;"/><br /><sub><b>Kent C. Dodds</b></sub>](https://kentcdodds.com)<br />[💻](https://github.com/kentcdodds/babel-plugin-codegen/commits?author=kentcdodds "Code") [📖](https://github.com/kentcdodds/babel-plugin-codegen/commits?author=kentcdodds "Documentation") [🚇](#infra-kentcdodds "Infrastructure (Hosting, Build-Tools, etc)") [⚠️](https://github.com/kentcdodds/babel-plugin-codegen/commits?author=kentcdodds "Tests") | [<img src="https://avatars1.githubusercontent.com/u/1958812?v=4" width="100px;"/><br /><sub><b>Michael Rawlings</b></sub>](https://github.com/mlrawlings)<br />[💻](https://github.com/kentcdodds/babel-plugin-codegen/commits?author=mlrawlings "Code") [📖](https://github.com/kentcdodds/babel-plugin-codegen/commits?author=mlrawlings "Documentation") [⚠️](https://github.com/kentcdodds/babel-plugin-codegen/commits?author=mlrawlings "Tests") | [<img src="https://avatars3.githubusercontent.com/u/5230863?v=4" width="100px;"/><br /><sub><b>Jan Willem Henckel</b></sub>](https://jan.cologne)<br />[💻](https://github.com/kentcdodds/babel-plugin-codegen/commits?author=djfarly "Code") [📖](https://github.com/kentcdodds/babel-plugin-codegen/commits?author=djfarly "Documentation") [⚠️](https://github.com/kentcdodds/babel-plugin-codegen/commits?author=djfarly "Tests") | [<img src="https://avatars3.githubusercontent.com/u/1824298?v=4" width="100px;"/><br /><sub><b>Karan Thakkar</b></sub>](https://twitter.com/geekykaran)<br />[📖](https://github.com/kentcdodds/babel-plugin-codegen/commits?author=karanjthakkar "Documentation") |
| :---: | :---: | :---: | :---: |

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors][all-contributors] specification.
Contributions of any kind welcome!

## LICENSE

MIT

<!-- prettier-ignore-start -->

[npm]: https://www.npmjs.com/
[node]: https://nodejs.org
[build-badge]: https://img.shields.io/travis/kentcdodds/babel-plugin-codegen.svg?style=flat-square
[build]: https://travis-ci.org/kentcdodds/babel-plugin-codegen
[coverage-badge]: https://img.shields.io/codecov/c/github/kentcdodds/babel-plugin-codegen.svg?style=flat-square
[coverage]: https://codecov.io/github/kentcdodds/babel-plugin-codegen
[version-badge]: https://img.shields.io/npm/v/babel-plugin-codegen.svg?style=flat-square
[package]: https://www.npmjs.com/package/babel-plugin-codegen
[downloads-badge]: https://img.shields.io/npm/dm/babel-plugin-codegen.svg?style=flat-square
[npmtrends]: http://www.npmtrends.com/babel-plugin-codegen
[license-badge]: https://img.shields.io/npm/l/babel-plugin-codegen.svg?style=flat-square
[license]: https://github.com/kentcdodds/babel-plugin-codegen/blob/master/LICENSE
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs]: http://makeapullrequest.com
[donate-badge]: https://img.shields.io/badge/$-support-green.svg?style=flat-square
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/kentcdodds/babel-plugin-codegen/blob/master/other/CODE_OF_CONDUCT.md
[emojis]: https://github.com/kentcdodds/all-contributors#emoji-key
[all-contributors]: https://github.com/kentcdodds/all-contributors
[glamorous]: https://github.com/paypal/glamorous
[preval]: https://github.com/kentcdodds/babel-plugin-preval
[codegen.macro]: https://www.npmjs.com/package/codegen.macro
[babel-plugin-macros]: https://github.com/kentcdodds/babel-plugin-macros

<!-- prettier-ignore-end -->
