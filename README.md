<div align="center">
<h1>babel-plugin-codegen 💥</h1>

<p>Generate code at build-time</p>
</div>

---

<!-- prettier-ignore-start -->
[![Build Status][build-badge]][build]
[![Code Coverage][coverage-badge]][coverage]
[![version][version-badge]][package]
[![downloads][downloads-badge]][npmtrends]
[![MIT License][license-badge]][license]
[![All Contributors][all-contributors-badge]](#contributors-)
[![PRs Welcome][prs-badge]][prs]
[![Code of Conduct][coc-badge]][coc]
[![Babel Macro][macros-badge]][babel-plugin-macros]
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
- [Issues](#issues)
  - [🐛 Bugs](#-bugs)
  - [💡 Feature Requests](#-feature-requests)
- [Contributors ✨](#contributors-)
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

Here you can see the difference between this plugin and
[babel-plugin-preval](https://github.com/kentcdodds/babel-plugin-preval), which
would output the content of `some-code.js` as a string instead:

```javascript
"var x = 'Hello world!'"

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

## Issues

_Looking to contribute? Look for the [Good First Issue][good-first-issue]
label._

### 🐛 Bugs

Please file an issue for bugs, missing documentation, or unexpected behavior.

[**See Bugs**][bugs]

### 💡 Feature Requests

Please file an issue to suggest new features. Vote on feature requests by adding
a 👍. This helps maintainers prioritize what to work on.

[**See Feature Requests**][requests]

## Contributors ✨

Thanks goes to these people ([emoji key][emojis]):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://kentcdodds.com"><img src="https://avatars.githubusercontent.com/u/1500684?v=3?s=100" width="100px;" alt=""/><br /><sub><b>Kent C. Dodds</b></sub></a><br /><a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=kentcdodds" title="Code">💻</a> <a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=kentcdodds" title="Documentation">📖</a> <a href="#infra-kentcdodds" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=kentcdodds" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/mlrawlings"><img src="https://avatars1.githubusercontent.com/u/1958812?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Michael Rawlings</b></sub></a><br /><a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=mlrawlings" title="Code">💻</a> <a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=mlrawlings" title="Documentation">📖</a> <a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=mlrawlings" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://jan.cologne"><img src="https://avatars3.githubusercontent.com/u/5230863?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jan Willem Henckel</b></sub></a><br /><a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=djfarly" title="Code">💻</a> <a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=djfarly" title="Documentation">📖</a> <a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=djfarly" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://twitter.com/geekykaran"><img src="https://avatars3.githubusercontent.com/u/1824298?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Karan Thakkar</b></sub></a><br /><a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=karanjthakkar" title="Documentation">📖</a></td>
    <td align="center"><a href="https://stackshare.io/jdorfman/decisions"><img src="https://avatars1.githubusercontent.com/u/398230?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Justin Dorfman</b></sub></a><br /><a href="#fundingFinding-jdorfman" title="Funding Finding">🔍</a></td>
    <td align="center"><a href="https://michaeldeboey.be"><img src="https://avatars3.githubusercontent.com/u/6643991?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Michaël De Boey</b></sub></a><br /><a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=MichaelDeBoey" title="Code">💻</a></td>
    <td align="center"><a href="https://silvenon.com"><img src="https://avatars0.githubusercontent.com/u/471278?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Matija Marohnić</b></sub></a><br /><a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=silvenon" title="Documentation">📖</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://twitter.com/minh_ngvyen"><img src="https://avatars3.githubusercontent.com/u/2852660?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Minh Nguyen</b></sub></a><br /><a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=NMinhNguyen" title="Code">💻</a> <a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=NMinhNguyen" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/calebeby"><img src="https://avatars.githubusercontent.com/u/13206945?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Caleb Eby</b></sub></a><br /><a href="https://github.com/kentcdodds/babel-plugin-codegen/commits?author=calebeby" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors][all-contributors] specification.
Contributions of any kind welcome!

## LICENSE

MIT

<!-- prettier-ignore-start -->
[npm]: https://www.npmjs.com
[node]: https://nodejs.org
[build-badge]: https://img.shields.io/github/workflow/status/kentcdodds/babel-plugin-codegen/validate?logo=github&style=flat-square
[build]: https://github.com/kentcdodds/babel-plugin-codegen/actions?query=workflow%3Avalidate
[coverage-badge]: https://img.shields.io/codecov/c/github/kentcdodds/babel-plugin-codegen.svg?style=flat-square
[coverage]: https://codecov.io/github/kentcdodds/babel-plugin-codegen
[version-badge]: https://img.shields.io/npm/v/babel-plugin-codegen.svg?style=flat-square
[package]: https://www.npmjs.com/package/babel-plugin-codegen
[downloads-badge]: https://img.shields.io/npm/dm/babel-plugin-codegen.svg?style=flat-square
[npmtrends]: https://www.npmtrends.com/babel-plugin-codegen
[license-badge]: https://img.shields.io/npm/l/babel-plugin-codegen.svg?style=flat-square
[license]: https://github.com/kentcdodds/babel-plugin-codegen/blob/master/LICENSE
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs]: https://makeapullrequest.com
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/kentcdodds/babel-plugin-codegen/blob/master/CODE_OF_CONDUCT.md
[emojis]: https://github.com/all-contributors/all-contributors#emoji-key
[all-contributors]: https://github.com/all-contributors/all-contributors
[all-contributors-badge]: https://img.shields.io/github/all-contributors/kentcdodds/babel-plugin-codegen?color=orange&style=flat-square
[bugs]: https://github.com/kentcdodds/babel-plugin-codegen/issues?utf8=%E2%9C%93&q=is%3Aissue+is%3Aopen+sort%3Acreated-desc+label%3Abug
[requests]: https://github.com/kentcdodds/babel-plugin-codegen/issues?utf8=%E2%9C%93&q=is%3Aissue+is%3Aopen+sort%3Areactions-%2B1-desc+label%3Aenhancement
[good-first-issue]: https://github.com/kentcdodds/babel-plugin-codegen/issues?utf8=%E2%9C%93&q=is%3Aissue+is%3Aopen+sort%3Areactions-%2B1-desc+label%3Aenhancement+label%3A%22good+first+issue%22
[glamorous]: https://github.com/paypal/glamorous
[preval]: https://github.com/kentcdodds/babel-plugin-preval
[codegen.macro]: https://www.npmjs.com/package/codegen.macro
[babel-plugin-macros]: https://github.com/kentcdodds/babel-plugin-macros
[macros-badge]: https://img.shields.io/badge/babel--macro-%F0%9F%8E%A3-f5da55.svg?style=flat-square
<!-- prettier-ignore-end -->
