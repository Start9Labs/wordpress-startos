import { sdk } from '../sdk'
import { setDependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { versionGraph } from '../versions'
import { actions } from '../actions'
import { restoreInit } from '../backups'
import { seedSecrets } from './seedSecrets'
import { taskCreateSite } from './taskCreateSite'

// taskSetAdminPassword (per-site "Set the admin password for <name>" task)
// is intentionally disabled in setupInit: iterating sites and calling
// sdk.action.createOwnTask inside setupOnInit hangs the init phase on
// `kind: 'update'` when one or more sites already exist. Fresh installs
// (sites empty, loop is a no-op) are unaffected, which is why this
// shipped initially. Until the underlying SDK / task-creation behaviour
// is understood, the Reset Admin Password action remains discoverable
// from the Actions tab and the user is expected to run it explicitly on
// a fresh site.
//
// import { taskSetAdminPassword } from './taskSetAdminPassword'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  setInterfaces,
  setDependencies,
  actions,
  seedSecrets,
  taskCreateSite,
)

export const uninit = sdk.setupUninit(versionGraph)
