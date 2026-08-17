import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const v_7_0_0_0 = VersionInfo.of({
  version: '7.0.0:0',
  releaseNotes: {
    en_US: 'Initial release. Host multiple WordPress sites on StartOS.',
    es_ES: 'Lanzamiento inicial. Aloja varios sitios de WordPress en StartOS.',
    de_DE: 'Erstveröffentlichung. Hosten Sie mehrere WordPress-Sites auf StartOS.',
    pl_PL: 'Pierwsze wydanie. Hostuj wiele witryn WordPress w StartOS.',
    fr_FR: 'Version initiale. Hébergez plusieurs sites WordPress sur StartOS.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
