const svelte = require('svelte/compiler')

function createProxyNode (types, nodes, node) {
  const check = {}
  return new Proxy(node, {
    get(target, prop) {
      if (prop === 'stop' || prop === 'skip') {
        return (is = true) => check[prop] = Boolean(is)
  
      } else if (prop === 'walk') {
        return (type, handler) => {
          let collect
          if (typeof type === 'function') {
            handler = type
            collect = nodes.get(node)
          } else if (handler === handler && types.has(type)) {
            collect = types.get(type).get(node)
          }

          for (let child of collect) {
            // if (check.stop) {
            //   check.stop = false
            //   break
            // }
            child = createProxyNode(types, nodes, child)
            handler(child)
            if (!check.skip) child.walk(...arguments)
            check.skip = false
          }

        }
      }
    }
  })
}

/**
 * Create catalog of nodes from AST by types
 * 
 * @param {Object} ast AST for catologize
 * @return {Object} 
 */
const createCatalog = (ast) => {
  if (!ast) return
  let root
  const typesCatalog = new Map()
  const nodesCatalog = new WeakMap()
  svelte.walk(ast, {
    enter(node, parent, prop, index) {
      if (!parent) {
        root = node
        parent = {}
      }
      if (!nodesCatalog.has(parent))
        nodesCatalog.set(parent, new Set())
      nodesCatalog.get(parent).add(node)

      let type = node.type || 'root'
      if (!typesCatalog.has(type))
        typesCatalog.set(type, new WeakMap())
      typesCatalog.get(type).set(parent, node)
    }
  })
  return createProxyNode(typesCatalog, nodesCatalog, root)
}

const astral = (input) => {
  const ast = svelte.parse(input)
  let html, css, instance, modul
  return {
    html: () => html = html || createCatalog(ast.html),
    css: () => css = css || createCatalog(ast.css),
    instance: () => instance = instance || createCatalog(ast.instance),
    module: () => modul = modul || createCatalog(ast.module)
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