
/**
 * 
 * @param {String|Array} types Types of ast node
 * @param {String} check Function who get match and converted node as arguments for checking
 * @param {Function} convertNode Handler for node transformation
 * @param {Map} catalog Catalog of nodes
 * @param {!Function} match Matcher for check node
 * @param {Function} handler Handler, get argument - matched node
 */
const createWalker = (types, check, convertNode) => (catalog, input) => (match, handler) => {
  const constrName = match.constructor.name
  if (constrName === 'Function') {
    handler = match
    check = () => true
  }

  if (types.constructor.name !== 'Array')
    types = [types]

  if (typeof handler !== 'function')
    return console.log('Missed handler')

  convertNode = typeof convertNode === 'function' ? convertNode
    : (node) => node

  for (const type of types)
    for (let node of catalog.get(type)) {
      node = convertNode(node, input)
      if (!node) continue
      if (!check(match, node)) continue
      handler(node)
    }
}

module.exports = createWalker