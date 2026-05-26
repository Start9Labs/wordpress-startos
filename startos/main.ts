import { writeFile, mkdir } from 'fs/promises'
import { manifest as FilebrowserManifest } from 'filebrowser-startos/startos/manifest'
import { storeJson, Site } from './fileModels/store.json'
import { sdk } from './sdk'
import { i18n } from './i18n'
import {
  FILEBROWSER_MOUNTPOINT,
  MARIADB_DATADIR,
  PHP_FPM_PORT,
  SITES_ROOT,
  dbNameFor,
  sitePathFor,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info('Starting WordPress…')

  const store = await storeJson.read().const(effects)
  if (!store?.dbRootPassword) {
    throw new Error('Database root password missing from store.json')
  }
  const { dbRootPassword } = store
  const sites: Site[] = store.sites || []

  const mariadbSub = await sdk.SubContainer.of(
    effects,
    { imageId: 'mariadb' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'mysql',
      subpath: null,
      mountpoint: MARIADB_DATADIR,
      readonly: false,
    }),
    'mariadb-sub',
  )

  let wpMounts = sdk.Mounts.of().mountVolume({
    volumeId: 'main',
    subpath: null,
    mountpoint: '/data',
    readonly: false,
  })
  if (sites.some((s) => !!s.pendingImport)) {
    wpMounts = wpMounts.mountDependency<typeof FilebrowserManifest>({
      dependencyId: 'filebrowser',
      volumeId: 'data',
      subpath: null,
      mountpoint: FILEBROWSER_MOUNTPOINT,
      readonly: true,
    })
  }

  const setupSub = await sdk.SubContainer.of(
    effects,
    { imageId: 'wordpress' },
    wpMounts,
    'setup-sub',
  )
  const phpFpmSub = await sdk.SubContainer.of(
    effects,
    { imageId: 'wordpress' },
    wpMounts,
    'php-fpm-sub',
  )
  const nginxSub = await sdk.SubContainer.of(
    effects,
    { imageId: 'wordpress' },
    wpMounts,
    'nginx-sub',
  )

  await mkdir(`${nginxSub.rootfs}/etc/nginx/http.d`, { recursive: true })
  await writeFile(
    `${nginxSub.rootfs}/etc/nginx/http.d/sites.conf`,
    renderNginxSites(sites),
  )

  const daemons = sdk.Daemons.of(effects)
    .addDaemon('mariadb', {
      subcontainer: mariadbSub,
      exec: {
        command: sdk.useEntrypoint(['--bind-address=127.0.0.1']),
        env: {
          MARIADB_ROOT_PASSWORD: dbRootPassword,
        },
      },
      ready: {
        display: i18n('Database'),
        fn: async () => {
          const { exitCode } = await mariadbSub.exec([
            'mariadb',
            '-h',
            '127.0.0.1',
            '-u',
            'root',
            `-p${dbRootPassword}`,
            '-e',
            'SELECT 1',
          ])
          return {
            result: exitCode === 0 ? 'success' : 'loading',
            message:
              exitCode === 0
                ? i18n('The database is ready')
                : i18n('Initializing database…'),
          }
        },
      },
      requires: [],
    })
    .addOneshot('setup-sites', {
      subcontainer: setupSub,
      exec: {
        command: ['/usr/local/bin/wp-setup.sh'],
        env: {
          DB_HOST: '127.0.0.1',
          DB_ROOT_PASSWORD: dbRootPassword,
          STORE_PATH: '/data/store.json',
          SITES_ROOT: SITES_ROOT,
          FILEBROWSER_MOUNTPOINT,
        },
      },
      requires: ['mariadb'],
    })
    .addDaemon('php-fpm', {
      subcontainer: phpFpmSub,
      exec: {
        command: ['php-fpm83', '-F', '-O'],
      },
      ready: {
        display: i18n('PHP Runtime'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, PHP_FPM_PORT, {
            successMessage: i18n('PHP-FPM is accepting connections'),
            errorMessage: i18n('PHP-FPM is not accepting connections'),
          }),
      },
      requires: ['setup-sites'],
    })
    .addDaemon('nginx', {
      subcontainer: nginxSub,
      exec: {
        command: ['nginx', '-g', 'daemon off;'],
      },
      ready: {
        display: i18n('Web Server'),
        fn: () => {
          const ports = sites.map((s) => s.port)
          if (ports.length === 0) {
            return Promise.resolve({
              result: 'success' as const,
              message: i18n(
                'No sites configured. Use the Manage Sites action to add one.',
              ),
            })
          }
          return sdk.healthCheck.checkPortListening(effects, ports[0], {
            successMessage: i18n('Web server is serving sites'),
            errorMessage: i18n('Web server is not accepting connections'),
          })
        },
      },
      requires: ['php-fpm'],
    })

  return daemons
})

function renderNginxSites(sites: Site[]): string {
  const blackhole = `server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;
  return 444;
}`

  const blocks = sites.map((site) => {
    const root = sitePathFor(site.id)
    return `server {
  listen ${site.port};
  listen [::]:${site.port};
  server_name _;
  root ${root};
  index index.php index.html;

  client_max_body_size 256M;

  location / {
    try_files $uri $uri/ /index.php?$args;
  }

  location ~ \\.php$ {
    try_files $uri =404;
    include /etc/nginx/fastcgi.conf;
    fastcgi_pass 127.0.0.1:${PHP_FPM_PORT};
    fastcgi_index index.php;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
  }

  location ~ /\\.(?!well-known).* {
    deny all;
  }

  location = /wp-config.php {
    deny all;
  }
}`
  })

  return [blackhole, ...blocks].join('\n\n')
}
