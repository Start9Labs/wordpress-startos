const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })
  module._compile(outputText, filename)
}

const { sdk } = require('../startos/sdk.ts')
const { storeJson } = require('../startos/fileModels/store.json.ts')
const { main } = require('../startos/main.ts')

sdk.Action.withInput = (id, metadata, spec, prefill, handler) => ({
  id,
  handler,
})
const {
  resetAdminPassword,
} = require('../startos/actions/resetAdminPassword.ts')
const { manage } = require('../startos/actions/manage.ts')
const {
  taskSetAdminPassword,
} = require('../startos/init/taskSetAdminPassword.ts')

const rootfs = fs.mkdtempSync(path.join(os.tmpdir(), 'wordpress-state-'))
const site = {
  id: 'testsite',
  port: 8000,
  name: 'Test',
  adminUser: 'testadmin',
  adminPassword: 'initial',
  adminEmail: 'admin@example.test',
  primaryUrl: null,
  adminPasswordRevealed: false,
}
let store = { dbRootPassword: 'test', sites: [site] }
let projection
let commands = []
let created = []
let cleared = []
const topology = {}

storeJson.read = (map) => ({
  const: async () => {
    projection = map
    return map(store)
  },
  once: async () => map(store),
})
storeJson.merge = async (_, patch) => {
  store = { ...store, ...patch }
}
sdk.SubContainer.of = async () => ({ rootfs })
sdk.SubContainer.withTemp = async (_, image, mounts, name, fn) => {
  await fn({
    execFail: async (command) => {
      commands.push(command)
    },
  })
}
sdk.Daemons.of = () => {
  const chain = {
    addDaemon: (id, config) => {
      topology[id] = config
      return chain
    },
    addOneshot: (id, config) => {
      topology[id] = config
      return chain
    },
  }
  return chain
}
sdk.action.createOwnTask = async (_, action, severity, options) => {
  created.push({ action, severity, ...options })
}
sdk.action.clearTask = async (_, id) => {
  cleared.push(id)
}

async function run() {
  await main({ effects: {} })
  const mainProjection = projection
  const initial = mainProjection(store)
  assert.deepEqual(initial, {
    dbRootPassword: 'test',
    sites: [{ id: site.id, port: 8000, primaryUrl: null }],
  })
  for (const patch of [
    { name: 'Renamed' },
    { adminPassword: 'rotated' },
    { adminPasswordRevealed: true },
  ]) {
    assert.deepEqual(
      mainProjection({ ...store, sites: [{ ...site, ...patch }] }),
      initial,
    )
  }
  for (const patch of [
    { id: 'other' },
    { port: 8001 },
    { primaryUrl: 'https://example.test' },
  ]) {
    assert.notDeepEqual(
      mainProjection({ ...store, sites: [{ ...site, ...patch }] }),
      initial,
    )
  }
  assert.notDeepEqual(mainProjection({ ...store, sites: [] }), initial)
  assert.notDeepEqual(
    mainProjection({ ...store, dbRootPassword: 'changed' }),
    initial,
  )
  assert.equal(topology['wp-cron'].exec.user, 'www-data')
  assert.equal(
    topology['wp-cron'].exec.env.WP_CLI_CACHE_DIR,
    '/tmp/wp-cli-cache',
  )
  assert.equal(
    fs.readFileSync(path.join(rootfs, 'etc/wp-cron-sites'), 'utf8'),
    '/data/sites/testsite\n',
  )

  await taskSetAdminPassword.init({})
  assert.equal(created.length, 1)
  assert.equal(created[0].severity, 'important')
  const taskId = created[0].replayId
  await resetAdminPassword.handler({ effects: {}, input: { siteId: site.id } })
  assert.equal(commands.length, 1)
  assert.equal(store.sites[0].adminPasswordRevealed, true)
  assert.notEqual(store.sites[0].adminPassword, site.adminPassword)
  assert.deepEqual(cleared, [taskId])
  assert.deepEqual(mainProjection(store), initial)
  await taskSetAdminPassword.init({})
  await taskSetAdminPassword.init({})
  assert.equal(
    created.length,
    1,
    'completed task stays cleared across reactive init and reboot',
  )

  store = { ...store, sites: [site] }
  cleared = []
  sdk.SubContainer.withTemp = async () => {
    throw new Error('wp-cli failure')
  }
  await assert.rejects(
    resetAdminPassword.handler({ effects: {}, input: { siteId: site.id } }),
    /wp-cli failure/,
  )
  assert.equal(store.sites[0].adminPasswordRevealed, false)
  assert.deepEqual(cleared, [])

  await manage.handler({ effects: {}, input: { sites: [] } })
  assert.deepEqual(store.sites, [])
  assert.deepEqual(
    cleared,
    [taskId],
    'removing a site clears its outstanding task',
  )
  console.log('State regressions passed')
}
run()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => fs.rmSync(rootfs, { recursive: true, force: true }))
