import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'
import { i18n } from './i18n'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const sites = (await storeJson.read((s) => s.sites).const(effects)) || []

  return Promise.all(
    sites.map(async (site) => {
      const { id, port, name } = site

      const multi = sdk.MultiHost.of(effects, id)
      const origin = await multi.bindPort(port, {
        protocol: 'http',
      })
      const ui = sdk.createInterface(effects, {
        name,
        id,
        description: i18n('The ${name} WordPress site', { name }),
        type: 'ui',
        masked: false,
        schemeOverride: null,
        username: null,
        path: '',
        query: {},
      })

      return origin.export([ui])
    }),
  )
})
