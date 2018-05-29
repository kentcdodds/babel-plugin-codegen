const {asProgram, asIdentifier, asImportDeclaration} = require('./replace')
const {isCodegenComment, looksLike} = require('./helpers')

module.exports = codegenPlugin

function codegenPlugin({transformFromAst}) {
  return {
    name: 'codegen',
    visitor: {
      Program(
        path,
        {
          file: {
            opts: {filename},
          },
        },
      ) {
        const firstNode = path.node.body[0] || {}
        const comments = firstNode.leadingComments || []
        const isCodegen = comments.some(isCodegenComment)

        if (isCodegen) {
          comments.find(isCodegenComment).value = ' this file was codegened'
          asProgram(transformFromAst, path, filename)
        }
      },
      Identifier(
        path,
        {
          file: {
            opts: {filename},
          },
        },
      ) {
        const isCodegen = path.node.name === 'codegen'
        if (isCodegen) {
          asIdentifier(path, filename)
        }
      },
      ImportDeclaration(
        path,
        {
          file: {
            opts: {filename},
          },
        },
      ) {
        const isCodegen = looksLike(path, {
          node: {
            source: {
              leadingComments(comments) {
                return comments && comments.some(isCodegenComment)
              },
            },
          },
        })
        if (isCodegen) {
          asImportDeclaration(path, filename)
        }
      },
    },
  }
}
