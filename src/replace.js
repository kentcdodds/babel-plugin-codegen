const getReplacement = require('./get-replacement')

module.exports = replace

function replace({path, string, filename}) {
  const replacement = getReplacement({
    string,
    filename,
  })
  if (!replacement) {
    path.remove()
  } else if (Array.isArray(replacement)) {
    path.replaceWithMultiple(replacement)
  } else {
    path.replaceWith(replacement)
  }
}
