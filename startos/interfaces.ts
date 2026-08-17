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
        id: `${id}-site`,
        description: i18n('Public web interface for ${name}', { name }),
        type: 'ui',
        masked: false,
        schemeOverride: null,
        username: null,
        path: '',
        query: {},
      })

      const admin = sdk.createInterface(effects, {
        name: i18n('${name} (admin)', { name }),
        id: `${id}-admin`,
        description: i18n(
          'WordPress admin dashboard for ${name}. Run Show Admin Credentials to look up the login.',
          { name },
        ),
        type: 'ui',
        masked: false,
        schemeOverride: null,
        username: null,
        path: '/wp-admin/',
        query: {},
      })

      return origin.export([ui, admin])
    }),
  )
})
