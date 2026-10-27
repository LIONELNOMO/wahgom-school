import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const xampp = process.env.WAMGHOM_XAMPP_PATH || 'C:\\xampp'
const php = resolve(xampp, 'php/php.exe')
const mysql = resolve(xampp, 'mysql/bin/mysql.exe')
const mysqld = resolve(xampp, 'mysql/bin/mysqld.exe')
const mysqlConfig = resolve(xampp, 'mysql/bin/my.ini')

function portIsOpen(port) {
  return new Promise((resolvePort) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    const finish = (open) => { socket.destroy(); resolvePort(open) }
    socket.setTimeout(500)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

async function waitForPort(port, attempts = 20) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await portIsOpen(port)) return true
    await new Promise((resolveWait) => setTimeout(resolveWait, 400))
  }
  return false
}

function run(file, args) {
  const result = spawnSync(file, args, { cwd: root, stdio: 'inherit', windowsHide: true })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
}

console.log('Préparation de l’introduction…')
run(process.execPath, [resolve(root, 'scripts/prepare-intro.mjs')])

if (!(await portIsOpen(3306))) {
  console.log('Démarrage de MySQL XAMPP…')
  const databaseProcess = spawn(mysqld, [`--defaults-file=${mysqlConfig}`, '--standalone'], {
    cwd: resolve(xampp, 'mysql/bin'),
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })
  databaseProcess.unref()
  if (!(await waitForPort(3306))) {
    console.error('MySQL ne répond pas. Démarrez-le depuis le panneau XAMPP.')
    process.exit(1)
  }
}

console.log('Vérification de la base wamghomschool…')
run(mysql, ['-u', 'root', '-e', 'CREATE DATABASE IF NOT EXISTS wamghomschool CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'])
run(php, [resolve(root, 'backend/scripts/install.php')])

let apiProcess = null
if (!(await portIsOpen(8080))) {
  console.log('Démarrage de l’API PHP sur http://127.0.0.1:8080…')
  apiProcess = spawn(php, ['-S', '127.0.0.1:8080', '-t', resolve(root, 'backend/public'), resolve(root, 'backend/public/index.php')], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
  })
  if (!(await waitForPort(8080))) {
    console.error('L’API PHP n’a pas pu démarrer sur le port 8080.')
    apiProcess.kill()
    process.exit(1)
  }
}

console.log('Démarrage de React sur http://localhost:5173…')
const viteProcess = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), '--host', '0.0.0.0'], {
  cwd: root,
  stdio: 'inherit',
})

const stop = () => {
  if (apiProcess && !apiProcess.killed) apiProcess.kill()
  if (!viteProcess.killed) viteProcess.kill()
}

process.once('SIGINT', () => { stop(); process.exit(0) })
process.once('SIGTERM', () => { stop(); process.exit(0) })
viteProcess.once('exit', (code) => { if (apiProcess && !apiProcess.killed) apiProcess.kill(); process.exit(code || 0) })
