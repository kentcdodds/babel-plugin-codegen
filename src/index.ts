import type babelCore from '@babel/core'
import {getReplacers} from './replace'
import {isCodegenComment, looksLike} from './helpers'

type VisitorState = {
  file: {
    opts: babelCore.TransformOptions
  }
}

function codegenPlugin(
  babel: typeof babelCore,
): {
  name: string
  visitor: babelCore.Visitor<VisitorState>
} {
  const {asProgram, asIdentifier, asImportDeclaration} = getReplacers(babel)
  return {
    name: 'codegen',
    visitor: {
      Program(path, {file: {opts: fileOpts}}) {
        const firstNode = path.node.body[0] || {}
        const comments = firstNode.leadingComments ?? []
        const codegenComment = comments.find(isCodegenComment)

        if (codegenComment) {
          codegenComment.value = ' this file was codegened'
          asProgram(path, fileOpts)
        }
      },
      Identifier(path, {file: {opts: fileOpts}}) {
        const isCodegen = path.node.name === 'codegen'
        if (isCodegen) {
          asIdentifier(path, fileOpts)
        }
      },
      ImportDeclaration(path, {file: {opts: fileOpts}}) {
        const isCodegen = looksLike(path, {
          node: {
            source: {
              leadingComments(
                comments: typeof path.node.source.leadingComments,
              ) {
                // istanbul ignore next because the ?? false should never happen
                // because "comments" should never be null, but the types say it could...
                return comments?.some(isCodegenComment) ?? false
              },
            },
          },
        })
        if (isCodegen) {
          asImportDeclaration(path, fileOpts)
        }
      },
    },
  }
}

export default codegenPlugin
