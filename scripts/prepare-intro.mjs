import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sourcePath = resolve(root, 'images/wamghomschool_intro_animatic.html')
const outputDirectory = resolve(root, 'public/intro')
const outputPath = resolve(outputDirectory, 'wamghomschool_intro_animatic.html')

let html = await readFile(sourcePath, 'utf8')

// L’animatic d’origine ne dépend de l’icône CDN que pour son bouton « Rejouer ».
// Ce bouton est masqué dans l’introduction : supprimer le CDN garantit le hors-ligne.
html = html
  .replace(/<link id="icon-font"[^>]*>/g, '')
  .replace(/<noscript><link id="icon-font"[^>]*><\/noscript>/g, '')

const introStyles = `<style id="wamghom-intro-shell">
html,body{width:100%;height:100%;margin:0!important;overflow:hidden;background:#0A1F4D!important}
body{padding:0!important;display:grid;place-items:center}
#vis-container{width:min(100vw,177.8vh);overflow:hidden!important}
#vis-container>div:first-of-type{margin:0!important;border-radius:0!important}
#vis-container>div:nth-of-type(2),#vis-container>div:nth-of-type(3){display:none!important}
@media(prefers-reduced-motion:reduce){#vis-container{display:none}}
</style>`

html = html.replace('</head>', `${introStyles}</head>`)
html = html.replace(
  /\nplay\(\);\n<\/script>/,
  `\nplay();\nsetTimeout(()=>window.parent.postMessage({type:'wamghom:intro-complete'},'*'),14000);\n</script>`,
)

await mkdir(outputDirectory, { recursive: true })
await writeFile(outputPath, html, 'utf8')
console.log(`Animatic d’introduction préparé : ${outputPath}`)
