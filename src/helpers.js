const p = require('path')
const requireFromString = require('require-from-string')

module.exports = {
  getReplacement,
  stringToAST,
  applyReplacementToPath,
  replace,
  resolveModuleToString,
  isCodegenComment,
  isPropertyCall,
  looksLike,
}

function getReplacement({string: stringToCodegen, filename}, babel) {
  /**
   * 1. Transform passed in code to generated code
   */
  const {code: transformedCode} = babel.transform(stringToCodegen, {filename})

  /**
   * 2. Execute the transformed code, as if it were required
   */
  const codegenedString = requireFromString(transformedCode, filename)

  /**
   * 3. Convert what the code exported (hopefully a string) into AST form
   */
  return stringToAST(codegenedString, babel)
}

function stringToAST(string, babel) {
  if (typeof string !== 'string') {
    throw new Error('codegen: Must module.exports a string.')
  }
  return babel.template(string, {
    sourceType: 'module',
    preserveComments: true,
    placeholderPattern: false,
    plugins: [
      // add more on request..
      'jsx',
      'dynamicImport',
      'objectRestSpread',
    ],
  })()
}

function applyReplacementToPath(replacement, path) {
  if (!replacement) {
    path.remove()
  } else if (Array.isArray(replacement)) {
    path.replaceWithMultiple(replacement)
  } else {
    path.replaceWith(replacement)
  }
}

function replace({path, string, filename}, babel) {
  const replacement = getReplacement({string, filename}, babel)
  applyReplacementToPath(replacement, path)
}

function resolveModuleToString({args, filename, source}) {
  const argValues = args.map(a => {
    const result = a.evaluate()
    if (!result.confident) {
      throw new Error(
        'codegen cannot determine the value of an argument in codegen.require',
      )
    }
    return result.value
  })
  const absolutePath = p.join(p.dirname(filename), source.node.value)
  try {
    // allow for transpilation of required modules
    require('@babel/register')
  } catch (e) {
    // ignore error
  }
  let mod = require(absolutePath)
  mod = mod && mod.__esModule ? mod.default : mod
  if (argValues.length) {
    if (typeof mod !== 'function') {
      throw new Error(
        `\`codegen.require\`-ed module (${
          source.node.value
        }) cannot accept arguments because it does not export a function. You passed the arguments: ${argValues.join(
          ', ',
        )}`,
      )
    }
    mod = mod(...argValues)
  }
  return mod
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
