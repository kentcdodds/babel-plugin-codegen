/* eslint-disable */

try {
  console.log(`require('babel-plugin-transform-object-rest-spread')`)
  console.log(require('babel-plugin-transform-object-rest-spread'))
} catch (error) {
  console.error(error)
}

try {
  console.log(
    `require('babel-plugin-transform-object-rest-spread/package.json')`,
  )
  console.log(
    JSON.stringify(
      require('babel-plugin-transform-object-rest-spread/package.json'),
      null,
      2,
    ),
  )
} catch (error) {
  console.error(error)
}
