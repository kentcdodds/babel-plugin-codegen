const {
  getReplacement,
  replace,
  resolveModuleContents,
  isCodegenComment,
  isPropertyCall,
  requireFromString,
} = require('./helpers')

module.exports = getReplacers

function getReplacers(babel) {
  function asProgram(path, fileOpts) {
    const {code} = babel.transformFromAst(path.node, {
      filename: fileOpts.filename,
      plugins: fileOpts.plugins,
      presets: fileOpts.presets,
    })
    const replacement = getReplacement({code, fileOpts}, babel)
    path.node.body = Array.isArray(replacement) ? replacement : [replacement]
  }

  function asImportDeclaration(path, fileOpts) {
    const codegenComment = path.node.source.leadingComments
      .find(isCodegenComment)
      .value.trim()
    const {code, resolvedPath} = resolveModuleContents({
      filename: fileOpts.filename,
      module: path.node.source.value,
    })
    let args
    if (codegenComment !== 'codegen') {
      args = requireFromString(
        `module.exports = [${codegenComment
          .replace(/codegen\((.*)\)/, '$1')
          .trim()}]`,
        fileOpts.filename,
      )
    }
    replace(
      {
        path,
        code,
        fileOpts: {
          ...fileOpts,
          filename: resolvedPath,
        },
        args,
      },
      babel,
    )
  }

  function asIdentifier(path, fileOpts) {
    const targetPath = path.parentPath
    switch (targetPath.type) {
      case 'TaggedTemplateExpression': {
        return asTag(targetPath, fileOpts)
      }
      case 'CallExpression': {
        const isCallee = targetPath.get('callee') === path
        if (isCallee) {
          return asFunction(targetPath, fileOpts)
        } else {
          return false
        }
      }
      case 'JSXOpeningElement': {
        const jsxElement = targetPath.parentPath
        return asJSX(jsxElement, fileOpts)
      }
      case 'JSXClosingElement': {
        // ignore the closing element
        // but don't mark as unhandled (return false)
        // we already handled the opening element
        return true
      }
      case 'MemberExpression': {
        const callPath = targetPath.parentPath
        const isRequireCall = isPropertyCall(callPath, 'require')
        if (isRequireCall) {
          return asImportCall(callPath, fileOpts)
        } else {
          return false
        }
      }
      default: {
        return false
      }
    }
  }

  function asImportCall(path, fileOpts) {
    const [source, ...args] = path.get('arguments')
    const {code, resolvedPath} = resolveModuleContents({
      filename: fileOpts.filename,
      module: source.node.value,
    })
    const argValues = args.map(a => {
      const result = a.evaluate()
      if (!result.confident) {
        throw new Error(
          'codegen cannot determine the value of an argument in codegen.require',
        )
      }
      return result.value
    })
    replace(
      {
        path,
        code,
        fileOpts: {
          ...fileOpts,
          filename: resolvedPath,
        },
        args: argValues,
      },
      babel,
    )
  }

  function asTag(path, fileOpts) {
    const code = path.get('quasi').evaluate().value
    if (!code) {
      throw path.buildCodeFrameError(
        'Unable to determine the value of your codegen string',
        Error,
      )
    }
    replace({path, code, fileOpts}, babel)
  }

  function asFunction(path, fileOpts) {
    const argumentsPaths = path.get('arguments')
    const code = argumentsPaths[0].evaluate().value
    replace(
      {
        path: argumentsPaths[0].parentPath,
        code,
        fileOpts,
      },
      babel,
    )
  }

  function asJSX(path, fileOpts) {
    const children = path.get('children')
    let code = children[0].node.expression.value
    if (children[0].node.expression.type === 'TemplateLiteral') {
      code = children[0].get('expression').evaluate().value
    }
    replace(
      {
        path: children[0].parentPath,
        code,
        fileOpts,
      },
      babel,
    )
  }

  return {
    asTag,
    asJSX,
    asFunction,
    asProgram,
    asImportCall,
    asImportDeclaration,
    asIdentifier,
  }
}

/*
eslint
  complexity: ["error", 8],
  max-lines-per-function: ["error", 250],
*/
