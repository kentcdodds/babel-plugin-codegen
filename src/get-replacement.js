const babel = require('babel-core')
const babylon = require('babylon')
const requireFromString = require('require-from-string')

module.exports = getReplacement
Object.assign(module.exports, {expressionToAST})

function getReplacement({string: stringToCodegen, filename}) {
  const {code: transformed} = babel.transform(stringToCodegen, {
    filename,
  })
  const val = requireFromString(transformed, filename)
  const fileNode = stringToFileNode(val)
  if (fileNode.program.body.length === 1) {
    return fileNode.program.body[0]
  } else {
    return fileNode.program.body
  }
}

function stringToFileNode(string) {
  if (typeof string !== 'string') {
    throw new Error('codegen: Must module.exports a string.')
  }
  return babylon.parse(string, {
    sourceType: 'module',
    plugins: [
      // add more on request...
      'jsx',
    ],
  })
}

function expressionToAST(string) {
  const fileNode = stringToFileNode(`var x = ${string}`)
  return fileNode.program.body[0].declarations[0].init
}
