import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'wordpress',
  title: 'WordPress',
  license: 'GPL-2.0-or-later',
  packageRepo: 'https://github.com/Start9Labs/wordpress-startos',
  upstreamRepo: 'https://github.com/WordPress/WordPress',
  marketingUrl: 'https://wordpress.org/',
  donationUrl: 'https://wordpressfoundation.org/donate/',
  docsUrls: ['https://wordpress.org/documentation/'],
  description: { short, long },
  volumes: ['main', 'mysql'],
  images: {
    wordpress: {
      source: {
        dockerBuild: {},
      },
      arch: ['x86_64', 'aarch64'],
    },
    mariadb: {
      source: {
        dockerTag: 'mariadb:11.8.7',
      },
      arch: ['x86_64', 'aarch64'],
    },
  },
  alerts: {
    install: null,
    update: null,
    uninstall: null,
    restore: null,
    start: null,
    stop: null,
  },
  dependencies: {
    filebrowser: {
      description: {
        en_US:
          'Optional. File Browser is used to hand WordPress site archives to this package when importing an existing site. Install File Browser first, upload your archive there, then run the Import Site action here.',
      },
      optional: true,
      metadata: {
        title: 'File Browser',
        icon: 'https://raw.githubusercontent.com/Start9Labs/filebrowser-startos/refs/heads/master/icon.svg',
      },
    },
  },
})
