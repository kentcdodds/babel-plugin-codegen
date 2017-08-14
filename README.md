<div align="center">
<h1>babel-plugin-codegen 💥</h1>

<p>Generate code at build-time</p>
</div>

<hr />

[![Build Status][build-badge]][build]
[![Code Coverage][coverage-badge]][coverage]
[![version][version-badge]][package]
[![downloads][downloads-badge]][npmcharts]
[![MIT License][license-badge]][LICENSE]

[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors)
[![PRs Welcome][prs-badge]][prs]
[![Code of Conduct][coc-badge]][coc]
[![Babel Macro](https://img.shields.io/badge/babel--macro-%F0%9F%8E%A3-f5da55.svg?style=flat-square)](https://github.com/kentcdodds/babel-macros)

[![Watch on GitHub][github-watch-badge]][github-watch]
[![Star on GitHub][github-star-badge]][github-star]
[![Tweet][twitter-badge]][twitter]

## The problem

The applications of this plugin are wide, so it's kinda hard to sum it up, but
basically my use case was I needed to add a bunch of named exports to
[`glamorous`][glamorous] (one for every DOM node type) and I didn't want to
maintain the exports in my source file. So someone created a post-build script
to concatenate them to the end of the file. I built this plugin so I could do
that without having an ad-hoc post-build script.

## This solution

This plugin allows you to generate code at build-time. Any code that runs
synchronously in node can be used to generate a string of code and that string
will be inserted in place of where your usage appears.

It works by accepting your code string (or module when using the `// @codegen`
comment directive) and requiring it as a module. Then it takes whatever the
export was (which should be a string) and converts that string to an AST node
and swaps your usage node with the new AST node.

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
1. All code run by `codegen` is _not_ run in a sandboxed environment
2. All code _must_ run synchronously.
3. All code will be transpiled via `babel-core` directly or `babel-register`
   and should follow all of the normal rules for `.babelrc` resolution (the
   closest `.babelrc` to the file being run is the one that's used). This means
   you can rely on any babel plugins/transforms that you're used to using
   elsewhere in your codebase.
4. The code that's generated may or may not be transpiled (babel plugin ordering
   is tricky business). **You should generate the code that you wish to ship.**

TODO...

### Template Tag

**Before**:

```javascript
codgen`
  const fs = require('fs')
  module.exports = fs.readFileSync(require.resolve('./some-code.js'), 'utf8')
`
```

**After** (assuming `some-code.js` contains the text: `var x = 'Hello world!'`):

```javascript
var x = 'Hello world!';
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
var x = 1;
```

You can also provide arguments! In this case, the module you import should
export a function which accepts those arguments and returns a string.

**Before**:

```javascript
import /* codegen(3) */ './assign-identity'
```

**After** (`assign-identity.js` is: `module.exports = input => 'var x = ' + JSON.stringify(input) + ';'`):

```javascript
var x = 3;
```

### codegen.require

**Before**:

```javascript
const x = codegen.require('./es6-identity', 3)
```

**After** (`es6-identity.js` is: `export default input => 'var x = ' + JSON.stringify(input) + ';'`):

```javascript
const x = 3;
```

### codegen file comment (`// @codegen`)

Using the codegen file comment will update a whole file to be evaluated down to an export.

Whereas the above usages (assignment/import/require) will only codegen the scope of the assignment or file being imported.

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
export const apple = 'apple';
export const orange = 'orange';
export const pear = 'pear';
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

## Use with [`babel-macros`][babel-macros]

Once you've [configured `babel-macros`](https://github.com/kentcdodds/babel-macros/blob/master/other/docs/user.md)
you can import/require the codegen macro at `babel-plugin-codegen/macro`.
For example:

```javascript
import codegen from 'babel-plugin-codegen/macro'

codegen`module.exports = ['a', 'b', 'c'].map(l => 'export const ' + l + ' = ' + JSON.stringify(l)).join(';')`

      ↓ ↓ ↓ ↓ ↓ ↓

export const a = "a";
export const b = "b";
export const c = "c";
```

> You could also use [`codegen.macro`][codegen.macro] if you'd prefer to type less 😀

## Caveats

One really important thing to note here is that it doesn't work by simply
replacing your code with whatever string you export. Instead it replaces it at
the AST level. This means that the resulting code should operate the same, but
the format of the code could be entirely different. Most of the time this should
not matter, but if it matters to you, please feel free to contribute back if you
feel like you could make it work!

## Inspiration

I built this to solve a problem I was experiencing with [glamorous][glamorous].
It's heavily based on my work in [babel-plugin-preval][preval].

## Other Solutions

I'm not aware of any, if you are please [make a pull request][prs] and add it
here!

## Contributors

Thanks goes to these people ([emoji key][emojis]):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
| [<img src="https://avatars.githubusercontent.com/u/1500684?v=3" width="100px;"/><br /><sub>Kent C. Dodds</sub>](https://kentcdodds.com)<br />[💻](https://github.com/kentcdodds/babel-plugin-codegen/commits?author=kentcdodds) [📖](https://github.com/kentcdodds/babel-plugin-codegen/commits?author=kentcdodds) 🚇 [⚠️](https://github.com/kentcdodds/babel-plugin-codegen/commits?author=kentcdodds) |
| :---: |
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors][all-contributors] specification.
Contributions of any kind welcome!

## LICENSE

MIT

[npm]: https://www.npmjs.com/
[node]: https://nodejs.org
[build-badge]: https://img.shields.io/travis/kentcdodds/babel-plugin-codegen.svg?style=flat-square
[build]: https://travis-ci.org/kentcdodds/babel-plugin-codegen
[coverage-badge]: https://img.shields.io/codecov/c/github/kentcdodds/babel-plugin-codegen.svg?style=flat-square
[coverage]: https://codecov.io/github/kentcdodds/babel-plugin-codegen
[version-badge]: https://img.shields.io/npm/v/babel-plugin-codegen.svg?style=flat-square
[package]: https://www.npmjs.com/package/babel-plugin-codegen
[downloads-badge]: https://img.shields.io/npm/dm/babel-plugin-codegen.svg?style=flat-square
[npmcharts]: http://npmcharts.com/compare/babel-plugin-codegen
[license-badge]: https://img.shields.io/npm/l/babel-plugin-codegen.svg?style=flat-square
[license]: https://github.com/kentcdodds/babel-plugin-codegen/blob/master/LICENSE
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs]: http://makeapullrequest.com
[donate-badge]: https://img.shields.io/badge/$-support-green.svg?style=flat-square
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/kentcdodds/babel-plugin-codegen/blob/master/other/CODE_OF_CONDUCT.md
[github-watch-badge]: https://img.shields.io/github/watchers/kentcdodds/babel-plugin-codegen.svg?style=social
[github-watch]: https://github.com/kentcdodds/babel-plugin-codegen/watchers
[github-star-badge]: https://img.shields.io/github/stars/kentcdodds/babel-plugin-codegen.svg?style=social
[github-star]: https://github.com/kentcdodds/babel-plugin-codegen/stargazers
[twitter]: https://twitter.com/intent/tweet?text=Check%20out%20babel-plugin-codegen!%20https://github.com/kentcdodds/babel-plugin-codegen%20%F0%9F%91%8D
[twitter-badge]: https://img.shields.io/twitter/url/https/github.com/kentcdodds/babel-plugin-codegen.svg?style=social
[emojis]: https://github.com/kentcdodds/all-contributors#emoji-key
[all-contributors]: https://github.com/kentcdodds/all-contributors
[glamorous]: https://github.com/paypal/glamorous
[preval]: https://github.com/kentcdodds/babel-plugin-preval
[codegen.macro]: https://www.npmjs.com/package/codegen.macro
[babel-macros]: https://github.com/babel-macros
