const {
  getReplacement,
  replace,
  resolveModuleToString,
  stringToAST,
  isCodegenComment,
  isPropertyCall,
} = require('./helpers')

module.exports = {
  asTag,
  asJSX,
  asFunction,
  asProgram,
  asImportCall,
  asImportDeclaration,
  asIdentifier,
}

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
      const isCallee = targetPath.get('callee') === path
      if (isCallee) {
        return asFunction(targetPath, filename)
      } else {
        return false
      }
    }
    case 'JSXOpeningElement': {
      const jsxElement = targetPath.parentPath
      return asJSX(jsxElement, filename)
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
    throw path.buildCodeFrameError(
      'Unable to determine the value of your codegen string',
      Error,
    )
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
  complexity: ["error", 8]
*/
