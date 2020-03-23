const getReplacers = require('./replace')
const {isCodegenComment, looksLike} = require('./helpers')

module.exports = codegenPlugin

function codegenPlugin(babel) {
  const {asProgram, asIdentifier, asImportDeclaration} = getReplacers(babel)
  return {
    name: 'codegen',
    visitor: {
      Program(path, {file: {opts: fileOpts}}) {
        const firstNode = path.node.body[0] || {}
        const comments = firstNode.leadingComments || []
        const isCodegen = comments.some(isCodegenComment)

        if (isCodegen) {
          comments.find(isCodegenComment).value = ' this file was codegened'
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
              leadingComments(comments) {
                return comments && comments.some(isCodegenComment)
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
