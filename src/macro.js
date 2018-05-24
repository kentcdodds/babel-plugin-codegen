// const printAST = require('ast-pretty-print')
const {createMacro} = require('babel-plugin-macros')
const replace = require('./replace')

module.exports = createMacro(codegenMacros)

function codegenMacros({references, state}) {
  references.default.forEach(referencePath => {
    if (referencePath.parentPath.type === 'TaggedTemplateExpression') {
      asTag(referencePath.parentPath.get('quasi'), state)
    } else if (referencePath.parentPath.type === 'CallExpression') {
      asFunction(referencePath.parentPath.get('arguments'), state)
    } else if (referencePath.parentPath.type === 'JSXOpeningElement') {
      asJSX(
        {
          attributes: referencePath.parentPath.get('attributes'),
          children: referencePath.parentPath.parentPath.get('children'),
        },
        state,
      )
    } else {
      // TODO: throw a helpful error message
    }
  })
}

function asTag(
  quasiPath,
  {
    file: {
      opts: {filename},
    },
  },
) {
  const string = quasiPath.parentPath.get('quasi').evaluate().value
  replace({
    path: quasiPath.parentPath,
    string,
    filename,
  })
}

function asFunction(
  argumentsPaths,
  {
    file: {
      opts: {filename},
    },
  },
) {
  const string = argumentsPaths[0].evaluate().value
  replace({
    path: argumentsPaths[0].parentPath,
    string,
    filename,
  })
}

function asJSX(
  {attributes, children}, //eslint-disable-line no-unused-vars
  {
    file: {
      opts: {filename},
    },
  },
) {
  let string = children[0].node.expression.value
  if (children[0].node.expression.type === 'TemplateLiteral') {
    string = children[0].get('expression').evaluate().value
  }
  replace({
    path: children[0].parentPath,
    string,
    filename,
  })
}
