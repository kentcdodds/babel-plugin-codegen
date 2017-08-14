const babel = require('babel-core')
const template = require('babel-template')
// const printAST = require('ast-pretty-print')
const requireFromString = require('require-from-string')

module.exports = getReplacement
Object.assign(getReplacement, {stringToAST})

function getReplacement({string: stringToCodegen, filename}) {
  const {code: transformed} = babel.transform(stringToCodegen, {
    filename,
  })
  const val = requireFromString(transformed, filename)
  return stringToAST(val)
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
