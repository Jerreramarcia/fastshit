#!/usr/bin/env node
/**
 * Diagrama vivo de bugs del flujo multi-sesión para el visor fastShit.
 *
 * `bugs.json` es la fuente de verdad: cada bug es una cadena de pasos
 * (error → testing → ok, o error → testing → error de KO → …) que solo crece.
 * `flow.json` y `flow.md` se regeneran enteros desde ahí, con la maqueta
 * calculada, para que nadie tenga que mover nodos a mano.
 *
 *   node mapa.mjs event '<json>'   aplica un evento y regenera
 *   node mapa.mjs render           regenera flow.json y flow.md
 *   node mapa.mjs publish          publica en el gist del perfil (URL fija)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const DIR = dirname(fileURLToPath(import.meta.url))
const BUGS = join(DIR, 'bugs.json')
const FLOW = join(DIR, 'flow.json')
const MD = join(DIR, 'flow.md')
// Orden del pipeline de ADA: es el orden vertical de las bandas.
const FASES = ['Preview', 'Finalize', 'Documentación', 'Desarrollo directo', 'Integración', 'Interfaz', 'Otros']
const STEP_LABEL = { testing: 'En verificación', ok: 'Verificado OK' }

function fail (message) { console.error(`error: ${message}`); process.exit(1) }
const readJson = (path, fallback) => existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')

function profile () {
  const perfiles = readJson(join(DIR, '..', 'perfiles.json'), null)
  const p = perfiles?.perfiles?.[perfiles.activo]
  if (!p?.mapa) fail('el perfil activo no tiene bloque "mapa" en .claude/flujo/perfiles.json')
  return { name: perfiles.activo, jira: p.jira, proyectoPruebas: p.proyectoPruebas, ...p.mapa }
}

/** Regla del visor que enlaza las claves del proyecto y del de pruebas (mismo sitio de Jira) con su página. */
function jiraLinks () {
  const { jira, proyectoPruebas } = profile()
  const keys = [jira?.projectKey, proyectoPruebas].filter(k => /^[A-Z][A-Z0-9]*$/.test(k ?? ''))
  if (!/^[\w.-]+$/.test(jira?.sitio ?? '') || keys.length === 0) return []
  return [{ pattern: `\\b(?:${keys.join('|')})-\\d+\\b`, url: `https://${jira.sitio}/browse/$0` }]
}

/**
 * Reglas que enlazan una MR con GitLab cuando el texto nombra su repo: «ada-core !1033» o «!946 (ada-backend)».
 * Un «!N» suelto no se enlaza: el número de MR solo es único dentro de su repo.
 */
function mrLinks () {
  const { gitlab, repos } = readJson(join(DIR, 'repos.json'), { repos: {} })
  return Object.entries(repos).flatMap(([name, path]) => {
    const url = `${gitlab}/${path}/-/merge_requests/$1`
    return [{ pattern: `\\b${name} !(\\d+)\\b`, url }, { pattern: `!(\\d+) \\(${name}\\)`, url }]
  })
}

/** Un evento nunca reescribe pasos: solo añade, salvo ticket/mr, que anotan el último error. */
function applyEvent (state, ev) {
  const items = Array.isArray(ev.items) ? ev.items.map(String) : []
  let bug = state.bugs.find(b => b.id === ev.bug)
  if (ev.evento === 'error') {
    if (bug) fail(`${ev.bug} ya existe; para un KO usa evento=ko`)
    if (!ev.titulo) fail('evento=error necesita titulo')
    const fase = FASES.includes(ev.fase) ? ev.fase : 'Otros'
    bug = { id: ev.bug, fase, titulo: ev.titulo, ticket: ev.ticket ?? null, steps: [{ type: 'error', items }] }
    state.bugs.push(bug)
    return `${bug.id} → error (${fase})`
  }
  if (!bug) fail(`no existe ${ev.bug}`)
  const last = bug.steps[bug.steps.length - 1]
  if (ev.evento === 'ticket' || ev.evento === 'mr') {
    if (ev.ticket) bug.ticket = ev.ticket
    const target = [...bug.steps].reverse().find(s => s.type === 'error')
    target.items.push(...items)
    return `${bug.id} → ${ev.evento}`
  }
  if (ev.evento === 'fase') {
    if (!FASES.includes(ev.fase)) fail(`fase desconocida: ${ev.fase}`)
    bug.fase = ev.fase
    return `${bug.id} → fase ${ev.fase}`
  }
  const allowed = { testing: ['error'], ok: ['testing'], ko: ['testing'] }[ev.evento]
  if (!allowed) fail(`evento desconocido: ${ev.evento}`)
  if (!allowed.includes(last.type)) fail(`${bug.id}: no se puede pasar de ${last.type} a ${ev.evento}`)
  bug.steps.push({ type: ev.evento === 'ko' ? 'error' : ev.evento, ko: ev.evento === 'ko', items })
  return `${bug.id} → ${ev.evento}`
}

// Alto aproximado de un nodo del visor: cabecera + líneas de items a ~38 caracteres por línea.
const nodeHeight = step => 80 + step.items.reduce((h, item) => h + Math.ceil(item.length / 38) * 16 + 6, 0)

function render (state) {
  const nodes = []; const edges = []
  let y = 50
  for (const fase of FASES) {
    const bugs = state.bugs.filter(b => b.fase === fase)
    const headerId = `fase-${slug(fase)}`
    nodes.push({ id: headerId, type: 'action', label: `FASE: ${fase}`, position: { x: 50, y } })
    let rowY = y
    bugs.forEach(bug => {
      const rowTop = rowY
      rowY += Math.max(...bug.steps.map(nodeHeight)) + 40
      const counters = {}
      let prev = headerId
      bug.steps.forEach((step, col) => {
        counters[step.type] = (counters[step.type] ?? 0) + 1
        const suffix = { error: 'err', testing: 'test', ok: 'ok' }[step.type]
        const id = `${bug.id}-${suffix}${step.type === 'ok' ? '' : counters[step.type]}`
        const label = step.type === 'error'
          ? (step.ko ? 'KO en verificación' : `${bug.ticket ? `${bug.ticket} · ` : `${bug.id} · `}${bug.titulo}`)
          : STEP_LABEL[step.type]
        nodes.push({ id, type: step.type, label, position: { x: 320 + col * 380, y: rowTop }, items: step.items })
        edges.push({ id: `${bug.id}-e${col + 1}`, source: prev, target: id, sourceHandle: null })
        prev = id
      })
    })
    y = Math.max(rowY, y + 120) + 60
  }
  const ids = [...nodes, ...edges].map(x => x.id)
  const dup = ids.find((id, i) => ids.indexOf(id) !== i)
  if (dup) fail(`id duplicado: ${dup}`)
  const nodeIds = new Set(nodes.map(n => n.id))
  const broken = edges.find(e => !nodeIds.has(e.source) || !nodeIds.has(e.target))
  if (broken) fail(`arista rota: ${broken.id}`)
  return { sheets: [{ id: `bugs-${slug(state.perfil)}`, name: `Bugs — ${state.perfil}`, nodes, edges, links: [...jiraLinks(), ...mrLinks()] }] }
}

function renderMd (state) {
  const tag = { error: '[ERROR]', testing: '[TESTING]', ok: '[OK]' }
  const lines = [`# Bugs — ${state.perfil}`, '']
  for (const fase of FASES) {
    const bugs = state.bugs.filter(b => b.fase === fase)
    if (!bugs.length) continue
    lines.push(`## FASE: ${fase}`, '')
    for (const bug of bugs) {
      lines.push(`- ${bug.ticket ? `${bug.ticket} · ` : `${bug.id} · `}${bug.titulo}`)
      for (const step of bug.steps) {
        lines.push(`  - ${step.ko ? '[ERROR] KO en verificación' : tag[step.type]}`)
        for (const item of step.items) lines.push(`    - ${item}`)
      }
    }
    lines.push('')
  }
  return lines.join('\n')
}

function write (state) {
  writeFileSync(BUGS, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  writeFileSync(FLOW, `${JSON.stringify(render(state), null, 2)}\n`, 'utf8')
  writeFileSync(MD, `${renderMd(state)}\n`, 'utf8')
}

function publish () {
  const p = profile()
  // El token sale de gh en cada publicación; nunca se escribe a disco.
  const token = execFileSync('gh', ['auth', 'token', '--user', p.githubUser], { encoding: 'utf8' }).trim()
  const out = execFileSync('node', [join(DIR, 'share.mjs'), FLOW], {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_TOKEN: token, FASTSHIT_BASE_URL: p.visor }
  })
  process.stdout.write(out)
}

const [cmd, arg] = process.argv.slice(2)
const state = readJson(BUGS, { perfil: profile().name, bugs: [] })
if (cmd === 'event') {
  let ev
  try { ev = JSON.parse(arg) } catch { fail('el evento no es JSON válido') }
  console.log(applyEvent(state, ev))
  write(state)
} else if (cmd === 'render') {
  write(state)
  console.log(`${state.bugs.length} bugs renderizados`)
} else if (cmd === 'publish') {
  publish()
} else {
  fail('uso: node mapa.mjs event \'<json>\' | render | publish')
}
