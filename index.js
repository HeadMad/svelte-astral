const svelte = require('svelte/compiler')
const CHILDRENS = new WeakMap()
const TYPES = new Map()
const MODIFIED_NODES = new WeakMap()

const is = new Proxy({}, {get: (_, prop) => (target) => target.constructor.name === prop})

const getWalkerNode = (node) => {
  if (MODIFIED_NODES.has(node))
    return MODIFIED_NODES.get(node)
  const result = createWalker(node)
  MODIFIED_NODES.set(node, result)
  return result
}

function walkChildrens(childrens, handler) {
  for (const rawChild of childrens) {
    if (check.stop) { check.stop = false; break }
    const child = getWalkerNode(rawChild)
    handler(child)
    if (!check.skip) child.walk(type, handler)
  } //for
}

function createWalker(node)
{
  const check = {}
  const checker = (prop) => (is = true) => check[prop] = Boolean(is)
  
  const walk = (type, handler) => {
    if (check.stop) { check.stop = false; return }
    if (!CHILDRENS.has(node)) return
    const childrens = CHILDRENS.get(node)

    if (is.Function(type)) {
      for (const rawChild of childrens) {
        if (check.stop) { check.stop = false; break }
        const child = getWalkerNode(rawChild)
        type(child)
        if (!check.skip) child.walk(type)
      } //for
      
    } else if (is.String(type) && is.Function(handler)) {
      if (TYPES.get(type).has(node))
        for (const child of TYPES.get(type).get(node)) {
          if (check.stop) break
          handler(getWalkerNode(child))
        }
      if (check.skip || check.stop) {
        check.stop = false
        check.skip = false
        return
      } 
      childrens.forEach((child) => getWalkerNode(child).walk(type, handler))
    }
  } //walk
  
  const props = new Map()
  props.set('walk', walk)
  props.set('stop', checker('stop'))
  props.set('skip', checker('skip'))

  return new Proxy(node, {
    get: (node, prop) => node[prop] || props.get(prop)
  })
}

function createCatalog(ast)
{
  let rootNode
  svelte.walk(ast, {
    enter(node, parent, prop, index) {
      if (!parent) { rootNode = node; return }

      if (!CHILDRENS.has(parent))
        CHILDRENS.set(parent, new Set())
      CHILDRENS.get(parent).add(node)

      if (!TYPES.has(node.type))
        TYPES.set(node.type, new WeakMap())
      
      if (!TYPES.get(node.type).has(parent))
        TYPES.get(node.type).set(parent, new Set())
      TYPES.get(node.type).get(parent).add(node)
      
    }
  })
  return createWalker(rootNode)
}

function astral(input)
{
  ast = svelte.parse(input)

  return {
    html: () => createCatalog(ast.html),
    css: () => createCatalog(ast.css),
  }

}

const runPlugins = (plugins) => {
  if (!plugins || plugins.constructor.name !== 'Array') return
  return {
    markup: ({ content, filename }) => {
      const ast = astral(content)
      for (const plugin of plugins) {
        if (typeof plugin !== 'function') continue
        if (plugin(ast, filename) === false) break
      }
    }
  }
}

module.exports = runPlugins