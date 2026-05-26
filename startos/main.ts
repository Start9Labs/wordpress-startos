import { writeFile, mkdir } from 'fs/promises'
import { storeJson, Site } from './fileModels/store.json'
import { sdk } from './sdk'
import { i18n } from './i18n'
import {
  MARIADB_DATADIR,
  PHP_FPM_PORT,
  SITES_ROOT,
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

  const wpMounts = sdk.Mounts.of().mountVolume({
    volumeId: 'main',
    subpath: null,
    mountpoint: '/data',
    readonly: false,
  })

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

  const fastcgi = `    include /etc/nginx/fastcgi.conf;
    fastcgi_pass 127.0.0.1:${PHP_FPM_PORT};
    fastcgi_index index.php;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    fastcgi_param HTTPS on;
    fastcgi_read_timeout 300s;
    fastcgi_send_timeout 300s;
    fastcgi_buffer_size 32k;
    fastcgi_buffers 8 32k;
    fastcgi_busy_buffers_size 32k;`

  const securityHeaders = `    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "interest-cohort=()" always;
    add_header Strict-Transport-Security "max-age=31536000" always;`

  const blocks = sites.map((site) => {
    const root = sitePathFor(site.id)
    return `server {
  listen ${site.port};
  listen [::]:${site.port};
  server_name _;
  root ${root};
  index index.php index.html;

  client_max_body_size 256M;

${securityHeaders}

  location = /favicon.ico { log_not_found off; access_log off; }
  location = /robots.txt  { log_not_found off; access_log off; allow all; }

  # Block XML-RPC entirely — primary brute-force / pingback abuse surface.
  location = /xmlrpc.php { deny all; access_log off; log_not_found off; }

  # Rate-limit logins.
  location = /wp-login.php {
    limit_req zone=wp_login burst=20 nodelay;
    try_files $uri =404;
${fastcgi}
  }

  # No PHP execution under wp-content/uploads — defense against uploaded payloads.
  location ~* ^/wp-content/uploads/.*\\.php$ {
    deny all;
  }

  # Direct PHP hits to wp-includes are not user-facing endpoints.
  location ~* ^/wp-includes/.*\\.php$ {
    deny all;
  }

  # Don't leak version-disclosing or install files.
  location ~* ^/(readme\\.(html|md|txt)|license\\.txt|wp-config-sample\\.php)$ {
    deny all;
  }
  location = /wp-admin/install.php       { deny all; }
  location = /wp-admin/maint/repair.php  { deny all; }

  # Block author-archive enumeration.
  if ($args ~* "(^|&)author=[0-9]+") {
    return 301 /;
  }

  location / {
    try_files $uri $uri/ /index.php?$args;
  }

  location ~ \\.php$ {
    try_files $uri =404;
${fastcgi}
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
