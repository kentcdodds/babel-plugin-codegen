const p = require('path')
const fs = require('fs')
const babel = require('babel-core')
const template = require('babel-template')
// const printAST = require('ast-pretty-print')
const requireFromString = require('require-from-string')

module.exports = {
  replace,
  looksLike,
  isCodegenComment,
  getReplacement,
  stringToAST,
  resolveModuleContents,
  isPropertyCall,
  transformAndRequire,
}

function transformAndRequire(code, filename) {
  const {code: transformed} = babel.transform(code, {
    filename,
  })
  return requireFromString(transformed, filename)
}

function getReplacement({string: stringToCodegen, filename, args = []}) {
  let mod = transformAndRequire(stringToCodegen, filename)
  mod = mod && mod.__esModule ? mod.default : mod
  if (typeof mod === 'function') {
    mod = mod(...args)
  } else if (args.length) {
    throw new Error(
      `codegen module (${p.relative(
        process.cwd(),
        filename,
      )}) cannot accept arguments because it does not export a function. You passed the arguments: ${args.join(
        ', ',
      )}`,
    )
  }
  return stringToAST(mod)
}

function stringToAST(string) {
  if (typeof string !== 'string') {
    throw new Error('codegen: Must module.exports a string.')
  }
  return template(string, {
    sourceType: 'module',
    preserveComments: true,
    plugins: [
      // add more on request...
      'jsx',
    ],
  })()
}

function replace({path, string, filename, args}) {
  const replacement = getReplacement({
    string,
    filename,
    args,
  })
  if (!replacement) {
    path.remove()
  } else if (Array.isArray(replacement)) {
    path.replaceWithMultiple(replacement)
  } else {
    path.replaceWith(replacement)
  }
}

function resolveModuleContents({filename, module}) {
  const resolvedPath = p.resolve(p.dirname(filename), module)
  const code = fs.readFileSync(require.resolve(resolvedPath))
  return {code, resolvedPath}
}

function isCodegenComment(comment) {
  const normalisedComment = comment.value
    .trim()
    .split(' ')[0]
    .trim()
  return (
    normalisedComment.startsWith('codegen') ||
    normalisedComment.startsWith('@codegen')
  )
}

function isPropertyCall(path, name) {
  return looksLike(path, {
    node: {
      type: 'CallExpression',
      callee: {
        property: {name},
      },
    },
  })
}

function looksLike(a, b) {
  return (
    a &&
    b &&
    Object.keys(b).every(bKey => {
      const bVal = b[bKey]
      const aVal = a[bKey]
      if (typeof bVal === 'function') {
        return bVal(aVal)
      }
      return isPrimitive(bVal) ? bVal === aVal : looksLike(aVal, bVal)
    })
  )
}

function isPrimitive(val) {
  // eslint-disable-next-line
  return val == null || /^[sbn]/.test(typeof val)
}

/*
eslint
  complexity: ["error", 8],
  import/no-unassigned-import: "off",
  import/no-dynamic-require: "off",
*/
