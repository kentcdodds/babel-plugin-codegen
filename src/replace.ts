import babelCore from '@babel/core'
import {
  getReplacement,
  replace,
  resolveModuleContents,
  isCodegenComment,
  isPropertyCall,
  requireFromString,
  getFilename,
} from './helpers'

function getReplacers(babel: typeof babelCore) {
  function asProgram(
    path: babelCore.NodePath<babelCore.types.Program>,
    fileOpts: babelCore.TransformOptions,
  ) {
    // @ts-expect-error the types for this is wrong...
    const result = babel.transformFromAstSync(path.node, {
      filename: fileOpts.filename,
      plugins: fileOpts.plugins,
      presets: fileOpts.presets,
    })

    // istanbul ignore next because this should never happen, but TypeScript needs me to handle it
    const code = result?.code ?? ''
    const replacement = getReplacement({code, fileOpts}, babel)
    path.node.body = Array.isArray(replacement) ? replacement : [replacement]
  }

  function asImportDeclaration(
    path: babelCore.NodePath<babelCore.types.ImportDeclaration>,
    fileOpts: babelCore.TransformOptions,
  ) {
    const filename = getFilename(fileOpts)
    const codegenComment = path.node.source.leadingComments
      ?.find(isCodegenComment)
      ?.value.trim()

    // istanbul ignore next because we don't even call `asImportDeclaration` if
    // there's not a codegen comment, but TypeScript gets mad otherwise
    if (!codegenComment) return

    const {code, resolvedPath} = resolveModuleContents({
      filename,
      module: path.node.source.value,
    })

    let args: Array<any> | undefined
    if (codegenComment !== 'codegen') {
      args = (requireFromString(
        `module.exports = [${codegenComment
          .replace(/codegen\((.*)\)/, '$1')
          .trim()}]`,
        filename,
      ) as unknown) as Array<any>
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

  // eslint-disable-next-line complexity
  function asIdentifier(
    path: babelCore.NodePath<babelCore.types.Identifier>,
    fileOpts: babelCore.TransformOptions,
  ) {
    const targetPath = path.parentPath
    switch (targetPath.type) {
      case 'TaggedTemplateExpression': {
        return asTag(
          targetPath as babelCore.NodePath<babelCore.types.TaggedTemplateExpression>,
          fileOpts,
        )
      }
      case 'CallExpression': {
        const isCallee = targetPath.get('callee') === path
        if (isCallee) {
          return asFunction(
            targetPath as babelCore.NodePath<babelCore.types.CallExpression>,
            fileOpts,
          )
        } else {
          return false
        }
      }
      case 'JSXOpeningElement': {
        const jsxElement = targetPath.parentPath
        return asJSX(
          jsxElement as babelCore.NodePath<babelCore.types.JSXOpeningElement>,
          fileOpts,
        )
      }
      case 'JSXClosingElement': {
        // ignore the closing element
        // but don't mark as unhandled (return false)
        // we already handled the opening element
        return true
      }
      case 'MemberExpression': {
        const callPath = targetPath.parentPath
        if (!callPath) return false
        const isRequireCall = isPropertyCall(callPath, 'require')
        if (isRequireCall) {
          return asImportCall(
            callPath as babelCore.NodePath<babelCore.types.CallExpression>,
            fileOpts,
          )
        } else {
          return false
        }
      }
      default: {
        return false
      }
    }
  }

  function asImportCall(
    path: babelCore.NodePath<babelCore.types.CallExpression>,
    fileOpts: babelCore.TransformOptions,
  ) {
    const [source, ...args] = path.get('arguments')
    const {code, resolvedPath} = resolveModuleContents({
      filename: getFilename(fileOpts),
      module: (source as babelCore.NodePath<babelCore.types.StringLiteral>).node
        .value,
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

  function asTag(
    path: babelCore.NodePath<babelCore.types.TaggedTemplateExpression>,
    fileOpts: babelCore.TransformOptions,
  ) {
    const code = path.get('quasi').evaluate().value as string
    if (!code) {
      throw path.buildCodeFrameError(
        'Unable to determine the value of your codegen string',
        Error,
      )
    }
    replace({path, code, fileOpts}, babel)
  }

  function asFunction(
    path: babelCore.NodePath<babelCore.types.CallExpression>,
    fileOpts: babelCore.TransformOptions,
  ) {
    const argumentsPaths = path.get('arguments')
    const code = argumentsPaths[0].evaluate().value as string
    replace(
      {
        path: argumentsPaths[0].parentPath,
        code,
        fileOpts,
      },
      babel,
    )
  }

  function asJSX(
    path: babelCore.NodePath<babelCore.types.JSXOpeningElement>,
    fileOpts: babelCore.TransformOptions,
  ) {
    const children = path.get('children') as Array<
      babelCore.NodePath<babelCore.types.JSXExpressionContainer>
    >
    const container = children[0]
    const expression = container.node.expression
    // @ts-expect-error value isn't on all nodes, but we will assume nobody
    // uses this for anything but the right kind of nodes...
    let code = expression.value as string
    if (expression.type === 'TemplateLiteral') {
      code = container.get('expression').evaluate().value as string
    }
    replace(
      {
        path: container.parentPath,
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

export {getReplacers}

/*
eslint
  @typescript-eslint/no-explicit-any: "off",
  complexity: ["error", 8],
  max-lines-per-function: ["error", 250],
*/
