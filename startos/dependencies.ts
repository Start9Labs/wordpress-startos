import { T } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
  const sites = (await storeJson.read((s) => s.sites).const(effects)) || []

  const deps: T.CurrentDependenciesResult<any> = {}

  if (sites.some((s) => !!s.pendingImport)) {
    deps['filebrowser'] = {
      kind: 'exists',
      versionRange: '>=2.63.2:0',
    }
  }

  return deps
})
