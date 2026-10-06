import { sdk } from '../sdk'
import { dependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { versionGraph } from '../versions'
import { actions } from '../actions'
import { restoreInit } from '../backups'
import { seedSecrets } from './seedSecrets'
import { taskCreateSite } from './taskCreateSite'
import { taskSetAdminPassword } from './taskSetAdminPassword'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  setInterfaces,
  actions,
  dependencies,
  seedSecrets,
  taskCreateSite,
  taskSetAdminPassword,
)

export const uninit = sdk.setupUninit(versionGraph)
