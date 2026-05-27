import { resetAdminPassword } from '../actions/resetAdminPassword'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { i18n } from '../i18n'

// For every site, surface a task prompting the user to set its admin
// password. replayId is per-site so multiple tasks coexist; the
// resetAdminPassword action handler calls sdk.action.clearTask with the
// matching replayId after a successful reset to dismiss the task.
//
// Subtle: we deliberately do NOT pass `input: { kind: 'partial', value:
// { siteId } }` or `when: { condition: 'input-not-matches', ... }` here,
// even though they would give nicer UX (action pre-filled with the right
// site, task auto-clears on matching invocation). Passing them causes
// startd to validate the partial against the action's input spec by
// calling getInput back into this container during setupInit. The SDK
// system is not yet wired up at that point in init, so the callback
// fails with "System not initialized" and createTask never returns —
// init hangs forever, manifesting as a stuck "updating" state on every
// re-install when sites already exist.
//
// Manual clearTask in the action handler is the workaround. The
// underlying SDK / startd behaviour should be fixed: input-partial
// validation during createTask must not depend on a callback into the
// same container that's currently in its init phase.
export const taskSetAdminPassword = sdk.setupOnInit(async (effects) => {
  const sites = (await storeJson.read((s) => s.sites).const(effects)) || []

  for (const site of sites) {
    await sdk.action.createOwnTask(effects, resetAdminPassword, 'important', {
      reason: i18n('Set the admin password for ${name}', { name: site.name }),
      replayId: `set-admin-password-${site.id}`,
    })
  }
})
