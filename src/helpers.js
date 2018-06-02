const p = require('path')
const fs = require('fs')
const requireFromString = require('require-from-string')

module.exports = {
  transformAndRequire,
  getReplacement,
  replace,
  resolveModuleContents,
  isCodegenComment,
  isPropertyCall,
  looksLike,
}

function transformAndRequire(
  {code, fileOpts, fileOpts: {filename, plugins, presets}},
  babel,
) {
  /**
   * Transform passed in code to generated code
   */
  const {code: transformedCode} = babel.transform(code, {
    filename,
    plugins,
    presets,
  })

  /**
   * Execute the transformed code, as if it were required
   */
  const module = requireFromString(transformedCode, fileOpts.filename)

  /**
   * Allow for es modules (default export)
   */
  return module && module.__esModule ? module.default : module
}

function getReplacement({code, fileOpts, args = []}, babel) {
  /**
   * Execute the code string to get the exported module
   */
  let module = transformAndRequire({code, fileOpts}, babel)

  /**
   * If a function is epxorted, call it with args
   */
  if (typeof module === 'function') {
    module = module(...args)
  } else if (args.length) {
    throw new Error(
      `codegen module (${p.relative(
        process.cwd(),
        fileOpts.filename,
      )}) cannot accept arguments because it does not export a function. You passed the arguments: ${args.join(
        ', ',
      )}`,
    )
  }

  /**
   * Convert whatever we got now (hopefully a string) into AST form
   */
  if (typeof module !== 'string') {
    throw new Error('codegen: Must module.exports a string.')
  }
  return babel.template(module, {
    preserveComments: true,
    placeholderPattern: false,
    ...fileOpts.parserOpts,
    sourceType: 'module',
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

function replace({path, code, fileOpts, args}, babel) {
  const replacement = getReplacement({code, args, fileOpts}, babel)
  applyReplacementToPath(replacement, path)
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
