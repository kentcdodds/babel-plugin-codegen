const {
  getReplacement,
  replace,
  resolveModuleToString,
  stringToAST,
  isCodegenComment,
  isPropertyCall,
} = require('./helpers')

exports.asTag = asTag
exports.asJSX = asJSX
exports.asFunction = asFunction
exports.asProgram = asProgram
exports.asImportCall = asImportCall
exports.asImportDeclaration = asImportDeclaration
exports.asIdentifier = asIdentifier

function asProgram(transformFromAst, path, filename) {
  const {code: string} = transformFromAst(path.node)
  const replacement = getReplacement({string, filename})
  path.node.body = Array.isArray(replacement) ? replacement : [replacement]
}

function asImportDeclaration(path, filename) {
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
}

function asIdentifier(path, filename) {
  const targetPath = path.parentPath
  switch (targetPath.type) {
    case 'TaggedTemplateExpression': {
      return asTag(targetPath, filename)
    }
    case 'CallExpression': {
      return asFunction(targetPath, filename)
    }
    case 'JSXOpeningElement': {
      const jsxElement = targetPath.parentPath
      return asJSX(jsxElement, filename)
    }
    case 'MemberExpression': {
      const callPath = targetPath.parentPath
      const isImportCall = isPropertyCall(callPath, 'import')
      const isRequireCall = isPropertyCall(callPath, 'require')
      if (isImportCall || isRequireCall) {
        return asImportCall(callPath, filename)
      } else {
        return false
      }
    }
    default: {
      return false
    }
  }
}

function asImportCall(path, filename) {
  const [source, ...args] = path.get('arguments')
  const string = resolveModuleToString({args, filename, source})
  const replacement = stringToAST(string)
  if (!replacement) {
    path.remove()
  } else if (Array.isArray(replacement)) {
    path.replaceWithMultiple(replacement)
  } else {
    path.replaceWith(replacement)
  }
}

function asTag(path, filename) {
  const string = path.get('quasi').evaluate().value
  if (!string) {
    throw new Error('Unable to determine the value of your codegen string')
  }
  replace({path, string, filename})
}

function asFunction(path, filename) {
  const argumentsPaths = path.get('arguments')
  const string = argumentsPaths[0].evaluate().value
  replace({
    path: argumentsPaths[0].parentPath,
    string,
    filename,
  })
}

// eslint-disable-next-line no-unused-vars
function asJSX(path, filename) {
  const children = path.get('children')
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

/*
eslint
  complexity: ["error", 7]
*/
