import fs from 'fs'
import remarkParse from 'remark-parse'
import remarkSlug from 'remark-slug'
import remarkRehype from 'remark-rehype'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeStringify from 'rehype-stringify'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

const markdown = fs.readFileSync('index.md', 'utf8')

function extractHeadings(options = {}) {
  const { store = [] } = options

  return (tree) => {
    visit(tree, 'heading', (node) => {
    const text = node.children
      .filter(child => child.type === 'text')
      .map(child => child.value)
      .join('')

    const id = text
      .toLowerCase()
      .replace(/[^\w]+/g, '-')
      .replace(/^-+|-+$/g, '')

    store.push({ depth: node.depth, text, id })
    })
  }
}

function wrapSections() {
  return (tree) => {
    const oldChildren = tree.children
    const newChildren = []
    let currentSection = null

    for (const node of oldChildren) {
      if (node.type === 'element' && node.tagName === 'h2') {
        currentSection = {
          type: 'element',
          tagName: 'section',
          properties: {},
          children: []
        }
        newChildren.push(currentSection)
        currentSection.children.push(node)
      }
      else if (currentSection) {
        currentSection.children.push(node)
      }
      else {
        newChildren.push(node)
      }
    }
    tree.children = newChildren
  }
}

function removeWhitespaceTextNodes() {
  return (tree) => {
    if (Array.isArray(tree.children)) {
      tree.children = tree.children.filter(child =>
        !(child.type === 'text' && /^[\s\r\n\t]*$/.test(child.value))
      )
    }
    visit(tree, 'element', (node) => {
      if (!Array.isArray(node.children)) return
      node.children = node.children.filter(child =>
        !(child.type === 'text' && /^[\s\r\n\t]*$/.test(child.value))
      )
    })
  }
}

function unwrapParagraphInListItems() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (
        node.tagName === 'li'
      ) {
        const oldChildren = node.children
        const newChildren = []

        for (const liChild of oldChildren) {
          if (liChild.type === 'element' && liChild.tagName === 'p') {
            newChildren.splice(newChildren.length, 0, ...liChild.children)
          } else {
            newChildren.push(liChild)
          }
        }

        node.children = newChildren
      }
    })
  }
}

function fuseCaption() {
  return (tree) => {
    visit(tree, 'element', (parent) => {

      const children = parent.children
      for (let i = 0; i < children.length - 1; i++) {
        const node = children[i]
        const next = children[i + 1]

        const isPStrong =
          node.type === 'element' &&
          node.tagName === 'p' &&
          Array.isArray(node.children) &&
          node.children.length === 1 &&
          node.children[0].type === 'element' &&
          node.children[0].tagName === 'strong'

        const isPreCode =
          next.type === 'element' &&
          next.tagName === 'pre' &&
          Array.isArray(next.children) &&
          next.children.length === 1 &&
          next.children[0].type === 'element' &&
          next.children[0].tagName === 'code'

        if (isPStrong && isPreCode) {
          // strong の中身を抽出
          const strongNode = node.children[0]
          const titleText = strongNode.children
            .filter(c => c.type === 'text')
            .map(c => c.value)
            .join('')

          const figcaption = {
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: [{ type: 'text', value: titleText }]
          }

          const figure = {
            type: 'element',
            tagName: 'figure',
            properties: {},
            children: [ figcaption, next ]
          }

          children.splice(i, 2, figure)
          i--
        }
      }
    })
  }
}

let headings = []
const processor = await unified()
  .use(remarkParse)
  .use(remarkSlug)
  .use(extractHeadings, { store: headings })
  .use(remarkRehype)
  .use(rehypeAutolinkHeadings, {
    behavior: 'append',
    properties: {
      className: ['anchor'],
      ariaHidden: 'true'
    },
    content: {
      type: 'text',
      value: '🔗'
    }
  })
  .use(removeWhitespaceTextNodes)
  .use(wrapSections)
  .use(unwrapParagraphInListItems)
  .use(fuseCaption)
  .use(rehypeStringify)

const bodyHtml = String(await processor.process(markdown))
const navHtml = `<nav class="toc">
  <ul>
    ${headings.map(h => `
      <li class="${h.depth > 1 ? 'indent' : ''}">
        <a href="#${h.id}">${h.text}</a>
      </li>`).join('\n')}
  </ul>
</nav>`

const githubCss = fs.readFileSync('node_modules/github-markdown-css/github-markdown-light.css', 'utf8')
const modCss = fs.readFileSync('style.css', 'utf8')
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
${githubCss}
${modCss}
  </style>
</head>
<body>
  ${navHtml}
  <div class="Box-sc-g0xbh4-0 bUQNHB">
    <article class="markdown-body entry-content container-lg" itemprop="text">
      ${bodyHtml}
    </article>
  </div>
</body>
</html>
`

fs.writeFileSync('index.html', html)
