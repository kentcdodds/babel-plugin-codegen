const p = require('path')
const getReplacement = require('./get-replacement')
const replace = require('./replace')

module.exports = codegenPlugin

function codegenPlugin({transformFromAst}) {
  return {
    name: 'codegen',
    visitor: {
      Program(path, {file: {opts: {filename}}}) {
        const firstNode = path.node.body[0] || {}
        const comments = firstNode.leadingComments || []
        const isCodegen = comments.some(isCodegenComment)

        if (!isCodegen) {
          return
        }

        comments.find(isCodegenComment).value = ' this file was codegened'

        const {code: string} = transformFromAst(path.node)
        const replacement = getReplacement({string, filename})
        path.node.body = Array.isArray(replacement) ?
          replacement :
          [replacement]
      },
      TaggedTemplateExpression(path, {file: {opts: {filename}}}) {
        const isCodegen = path.node.tag.name === 'codegen'
        if (!isCodegen) {
          return
        }
        const string = path.get('quasi').evaluate().value
        if (!string) {
          throw new Error(
            'Unable to determine the value of your codegen string',
          )
        }
        replace({path, string, filename})
      },
      ImportDeclaration(path, {file: {opts: {filename}}}) {
        const isCodegen = looksLike(path, {
          node: {
            source: {
              leadingComments(comments) {
                return comments && comments.some(isCodegenComment)
              },
            },
          },
        })
        if (!isCodegen) {
          return
        }
        const codegenComment = path.node.source.leadingComments
          .find(isCodegenComment)
          .value.trim()
        let args
        if (codegenComment !== 'codegen') {
          args = codegenComment.replace(/codegen\((.*)\)/, '$1').trim()
        }

        replace({
          path,
          string: `
            try {
              // allow for transpilation of required modules
              require('babel-register')
            } catch (e) {
              // ignore error
            }
            var mod = require('${path.node.source.value}');
            mod = mod && mod.__esModule ? mod.default : mod
            ${args ? `mod = mod(${args})` : ''}
            module.exports = mod
          `,
          filename,
        })
      },
      CallExpression(path, {file: {opts: {filename}}}) {
        const isCodegen = looksLike(path, {
          node: {
            callee: {
              type: 'MemberExpression',
              object: {name: 'codegen'},
              property: {name: 'require'},
            },
          },
        })
        if (!isCodegen) {
          return
        }
        const [source, ...args] = path.get('arguments')
        const string = resolveModuleToString({args, filename, source})
        const replacement = getReplacement.stringToAST(string)
        if (!replacement) {
          path.remove()
        } else if (Array.isArray(replacement)) {
          path.replaceWithMultiple(replacement)
        } else {
          path.replaceWith(replacement)
        }
      },
    },
  }
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
    require('babel-register')
  } catch (e) {
    // ignore error
  }
  let mod = require(absolutePath)
  mod = mod && mod.__esModule ? mod.default : mod
  if (argValues.length) {
    if (typeof mod !== 'function') {
      throw new Error(
        `\`codegen.require\`-ed module (${source.node
          .value}) cannot accept arguments because it does not export a function. You passed the arguments: ${argValues.join(
          ', ',
        )}`,
      )
    }
    mod = mod(...argValues)
  }
  return mod
}

function isCodegenComment(comment) {
  const normalisedComment = comment.value.trim().split(' ')[0].trim()
  return (
    normalisedComment.startsWith('codegen') ||
    normalisedComment.startsWith('@codegen')
  )
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
  return val == null || /^[sbn]/.test(typeof val);
}

/*
eslint
  import/no-unassigned-import:0
  import/no-dynamic-require:0
*/
