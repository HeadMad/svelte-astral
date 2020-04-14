const svelte = require('svelte/compiler')


const createProxyNode = (catalog, node, parent, property, index, store = {}) => new Proxy(node, {
  set(target, prop, value) {
    store[prop] = value
    return true
  },
  get(target, prop) {
    if (prop === 'stop') {
      return (is = true) => store.stop = Boolean(is)

    } else if (prop === 'walk') {
      return (handler) => {
        if (typeof handler !== 'function') return
        for (const child of parent[property]) {
          if (store.stop) {
            store.stop = false
            break
          }
          handler(child)
          child.walk(handler)
        }
      }
      
    } else if (prop.startsWith('walk')) {
      const type = prop.substr(4)
      return (handler) => {
        if (typeof handler !== 'function') return
        if (!catalog.has(type)) return
        const collect = catalog.get(type)
        if (!collect.has(node)) return
        for (const child of collect.get(node)) {
          if (store.stop) {
            store.stop = false
            break
          }
          handler(child)
        }
      }
    } else {
      return target[prop] || store[prop]
    }
  }
})

/**
 * Create catalog of nodes from AST by types
 * 
 * @param {Object} ast AST for catologize
 * @return {Object} Has 2 methods: walk and skip
 */
const createCatalog = (ast, rootParent, rootIndex, type) => {
  if (!ast) return
  const catalog = new Map()
  let rootNode
  svelte.walk(ast, {
    enter(node, parent, prop, index) {
      if (!parent) {
        parent = rootParent
        prop = 'children'
        index = rootIndex
        rootNode = node = createProxyNode(catalog, node, parent, prop, index)
        // parent.children[index] = rootNode
      } else {
        node = createProxyNode(catalog, ...arguments)
      }

      if (type) node.type = type
      node.parent = parent

      if (index === null) parent[prop] = node
      else parent[prop][index] = node

      if (!catalog.has(node.type))
        catalog.set(node.type, new WeakMap())

      catalog.get(node.type).set(parent, node)
    }
  })
  return rootNode
}

const astral = (input) => {
  const ast = svelte.parse(input)
  const root = {type: 'Catalog', children: []}
  let html, css, instance, modul, i = 0


  return {
    html: () => html = html || createCatalog(ast.html, root, i),
    css: () => css = css || createCatalog(ast.css, root, ++i, 'Styles'),
    instance: () => instance = instance || createCatalog(ast.instance, root, ++i, 'Instance'),
    // module: () => modul = modul || createCatalog(ast.module, root, ++i, 'Module')
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