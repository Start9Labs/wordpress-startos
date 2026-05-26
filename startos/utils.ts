import { utils as sdkUtils } from '@start9labs/start-sdk'

export const MARIADB_DATADIR = '/var/lib/mysql'
export const PHP_FPM_PORT = 9000
export const SITE_PORT_BASE = 8000
export const SITES_ROOT = '/data/sites'

export const ID_CHARSET = 'a-z,0-9'
export const ID_LEN = 12
export const PASSWORD_CHARSET = 'a-z,A-Z,0-9'
export const PASSWORD_LEN = 32
export const SECRET_LEN = 64

export function newSiteId(): string {
  return sdkUtils.getDefaultString({ charset: ID_CHARSET, len: ID_LEN })
}

export function newPassword(): string {
  return sdkUtils.getDefaultString({ charset: PASSWORD_CHARSET, len: PASSWORD_LEN })
}

export function newSecret(): string {
  return sdkUtils.getDefaultString({ charset: PASSWORD_CHARSET, len: SECRET_LEN })
}

export function dbNameFor(siteId: string): string {
  return `wp_${siteId}`
}

export function sitePathFor(siteId: string): string {
  return `${SITES_ROOT}/${siteId}`
}

export function nextSitePort(used: Set<number>): number {
  let port = SITE_PORT_BASE
  while (used.has(port)) port++
  return port
}
