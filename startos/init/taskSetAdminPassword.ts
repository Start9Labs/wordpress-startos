import { resetAdminPassword } from '../actions/resetAdminPassword'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { adminPasswordTaskId } from '../utils'

export const taskSetAdminPassword = sdk.setupOnInit(async (effects) => {
  const sites = (await storeJson.read((s) => s.sites).const(effects)) || []

  for (const site of sites.filter((s) => !s.adminPasswordRevealed)) {
    await sdk.action.createOwnTask(effects, resetAdminPassword, 'important', {
      reason: i18n('Set the admin password for ${name}', { name: site.name }),
      replayId: adminPasswordTaskId(site.id),
      when: { condition: 'input-not-matches', once: false },
      input: {
        kind: 'partial',
        // The reset handler clears this task; other sites' inputs must not satisfy it.
        accept: [],
        set: { siteId: site.id },
      },
    })
  }
})
