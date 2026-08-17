export const DEFAULT_LANG = 'en_US'

const dict = {
  // interfaces.ts
  'The ${name} WordPress site': 0,

  // main.ts
  Database: 1,
  'The database is ready': 2,
  'Initializing database…': 3,
  'PHP Runtime': 4,
  'PHP-FPM is accepting connections': 5,
  'PHP-FPM is not accepting connections': 6,
  'Web Server': 7,
  'No sites configured. Use the Manage Sites action to add one.': 8,
  'Web server is serving sites': 9,
  'Web server is not accepting connections': 10,

  // actions/manage.ts
  Sites: 11,
  'Site Name': 12,
  'A short label for this site (e.g. "Marketing", "Blog"). Used as the interface name in StartOS.': 13,
  'Up to 63 characters: letters, numbers, spaces, hyphens, underscores. Must start with a letter or number.': 14,
  'Manage Sites': 15,
  'Add new WordPress sites, rename existing ones, or remove ones you no longer need. Each row is an independent WordPress install with its own database and hostname.': 16,
  'Removing a site discards its database and all uploaded files. This cannot be undone.': 17,

  // actions/importSite.ts
  'Archive Path': 18,
  'Path to the WordPress export archive inside File Browser. Must be a .tar.gz or .zip containing a wp-content directory and a .sql database dump at the archive root.': 19,
  'A short label for the imported site (e.g. "Marketing", "Blog"). Used as the interface name in StartOS.': 20,
  'Import Site': 21,
  'Import an existing WordPress site from a File Browser-hosted archive. The archive must contain wp-content/ and a .sql dump at the archive root.': 22,
  'Requires the File Browser package to be installed. Place your WordPress archive there first, then run this action with its path.': 23,

  // actions/showAdminCredentials.ts
  'Show Admin Credentials': 24,
  'Reveal the auto-generated WordPress admin username and password for one of your sites.': 25,
  Site: 26,
  'Which site to reveal credentials for.': 27,
  'Admin Credentials for ${name}': 28,
  'Use these credentials to sign in at /wp-admin on this site.': 29,
  Username: 30,
  Password: 31,

  // init/taskCreateSite.ts
  'Add your first WordPress site!': 32,

  // interfaces.ts (additions)
  'Public web interface for ${name}': 33,
  '${name} (admin)': 34,
  'WordPress admin dashboard for ${name}. Run Show Admin Credentials to look up the login.': 35,

  // main.ts (wp-cron daemon)
  Scheduler: 36,
  'Cron loop running': 37,

  // actions/setPrimaryUrl.ts
  'Primary URL': 38,
  'Pick the URL WordPress should use when it has no incoming request to derive one from — wp-cron events, email notifications, scheduled-post permalinks, sitemap entries. Each option is labelled with the site it belongs to.': 39,
  'Set Primary URL': 40,
  'Choose a primary URL for one of your sites. Affects URLs WordPress emits outside of an HTTP request (cron, email).': 41,

  // actions/resetAdminPassword.ts
  'Reset Admin Password': 42,
  'Generate a new random password for the WordPress admin account on one of your sites and reveal it. Run this for the initial sign-in on a fresh site, or any time you need to recover access — once you change the password from inside WordPress this is the only way to get back in.': 43,
  'Which site to reset the admin password on.': 44,
  'Admin Password Reset for ${name}': 45,
  'A new admin password has been set on this site. Sign in at /wp-admin with these credentials.': 46,

  // init/taskSetAdminPassword.ts
  'Set the admin password for ${name}': 47,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
