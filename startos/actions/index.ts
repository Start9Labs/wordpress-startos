import { sdk } from '../sdk'
import { manage } from './manage'
import { importSite } from './importSite'
import { showAdminCredentials } from './showAdminCredentials'

export const actions = sdk.Actions.of()
  .addAction(manage)
  .addAction(importSite)
  .addAction(showAdminCredentials)
