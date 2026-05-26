import { sdk } from '../sdk'
import { manage } from './manage'
import { showAdminCredentials } from './showAdminCredentials'

export const actions = sdk.Actions.of()
  .addAction(manage)
  .addAction(showAdminCredentials)
