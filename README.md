<p align="center">
  <img src="icon.svg" alt="WordPress on StartOS" width="21%">
</p>

# WordPress on StartOS

> **Upstream repo:** <https://github.com/WordPress/WordPress>

Host any number of independent WordPress sites side by side on StartOS. Each site gets its own MariaDB database, its own set of hostnames managed by StartOS, and its own auto-generated admin account. Sites can be created from scratch through the **Manage Sites** action, or imported from a WordPress backup via **File Browser**.

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Per-Site Lifecycle](#per-site-lifecycle)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Actions (StartOS UI)](#actions-startos-ui)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Dependencies](#dependencies)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

## Image and Container Runtime

| Property      | Value                                                                                |
| ------------- | ------------------------------------------------------------------------------------ |
| Images        | `wordpress` (built from `./Dockerfile` — Alpine 3.21 + nginx + PHP 8.3-FPM + wp-cli + WP 7.0 core) / `mariadb:11.8.7` |
| Architectures | x86_64, aarch64                                                                      |
| Daemons       | `mariadb`, `setup-sites` (oneshot), `php-fpm`, `nginx`                               |

`wordpress` and `mariadb` run as separate subcontainers and communicate over the loopback interface (`127.0.0.1`). nginx and PHP-FPM share the same image; PHP-FPM listens on `127.0.0.1:9000`. WordPress core (7.0) is baked into the image at `/usr/local/share/wordpress-core` and copied into each new site's data directory on first setup.

## Volume and Data Layout

| Volume  | Mount Point      | Purpose                                                  |
| ------- | ---------------- | -------------------------------------------------------- |
| `main`  | `/data`          | One subdirectory per site at `/data/sites/<site-id>/` containing WordPress files; `/data/store.json` holds the sites registry. |
| `mysql` | `/var/lib/mysql` | MariaDB data directory.                                  |

Optional read-only mount: `filebrowser:data` at `/mnt/filebrowser/` when a site has a pending import.

## Installation and First-Run Flow

1. Install the package. A random MariaDB root password is generated and stored in `store.json`.
2. A **critical task** prompts the user to add their first site via **Manage Sites**.
3. When the user adds a row, the action generates a stable random `id`, allocates the next free internal port, and stores generated admin credentials. No work happens yet.
4. The next time `setupMain` runs, the `setup-sites` oneshot detects new sites (no `.installed` marker), creates the DB schema, lays down WordPress files, writes `wp-config.php`, and runs `wp core install`.
5. nginx exposes the site on its internal port; StartOS routes external hostnames to that port through the site's MultiHost.

## Per-Site Lifecycle

Each site is independent. Data layout:

```
/data/sites/<id>/                 WordPress installation root
  wp-config.php                   generated; dynamic WP_HOME/WP_SITEURL from Host header
  wp-content/                     themes, plugins, uploads
  .installed                      idempotency marker
```

A site goes through one of two installation paths:

- **Fresh** — `wp core install` lays down a new install with the auto-generated admin credentials.
- **Import** — the **Import Site** action queues a pending import; the next `setup-sites` run extracts the archive (`.tar.gz` / `.tar` / `.zip`) from File Browser, imports the bundled `.sql` dump, regenerates `wp-config.php` (so URLs become dynamic), and runs `wp core update-db`.

The dynamic `WP_HOME` / `WP_SITEURL` in `wp-config.php` mean the site is reachable on every hostname the user adds to the MultiHost — no per-site URL configuration step is needed.

## Network Access and Interfaces

The package creates **one MultiHost and two Interfaces per site** — one for the public site (`/`) and one for the WordPress admin dashboard (`/wp-admin/`). They share hostnames (managed through the StartOS UI on the MultiHost) and the same internal port; the only difference is the path opened when the user clicks the interface. Interface IDs are `<site-id>-site` and `<site-id>-admin`.

Internally each site listens on its own port (`8000`, `8001`, …) — StartOS routes external hostnames to that port.

| Source              | Internal port | External                                  |
| ------------------- | ------------- | ----------------------------------------- |
| Site 1              | 8000          | Hostnames added by user to the MultiHost (shared by site + admin interfaces) |
| Site 2              | 8001          | Hostnames added by user to the MultiHost (shared by site + admin interfaces) |
| …                   | 8002+         | …                                         |
| Default (catch-all) | 80            | Refuses unknown traffic (`return 444`)    |

`wp-config.php` forces `$_SERVER['HTTPS'] = 'on'` so WordPress's `is_ssl()`-driven redirect logic agrees with the `https://` URLs we emit — StartOS terminates TLS at the platform edge and proxies plain HTTP to the container, so without this `/wp-admin` gets caught in a redirect loop.

## Actions (StartOS UI)

| Action                        | Purpose                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| **Manage Sites**              | List editor: add new sites by adding rows, rename in place, remove by deleting rows.     |
| **Show Admin Credentials**    | Reveal the auto-generated admin username and password for a chosen site.                 |

Migrations from existing WordPress installs go through WordPress's own plugin ecosystem (All-in-One WP Migration, Duplicator, BackupBuddy, UpdraftPlus, etc.) — create a fresh site here, install the migration plugin inside WordPress, and use its restore flow.

## Backups and Restore

| Item        | Included |
| ----------- | -------- |
| `main` volume (sites, store.json) | ✅ |
| `mysql` volume (databases)        | ✅ |

Restored as raw volume snapshots. The package should be stopped during backup for consistency.

## Health Checks

| Daemon / Check | Method                                              |
| -------------- | --------------------------------------------------- |
| `mariadb`      | `mariadb -e 'SELECT 1'` against the loopback DB.    |
| `php-fpm`      | Port `9000` listening.                              |
| `nginx`        | First site's port listening, or success-with-message when no sites exist. |

## Dependencies

None. WordPress runs self-contained with bundled MariaDB; migrations from elsewhere are expected to happen through WordPress plugins inside a fresh site.

## Security Hardening

The package applies a baseline of WordPress-specific hardening out of the box. Nothing the user needs to configure.

**nginx (per-site server block, generated by `setupMain`):**

- `server_tokens off` globally
- Block `/xmlrpc.php` (primary brute-force / pingback abuse surface)
- Block PHP execution under `/wp-content/uploads/` (prevents uploaded payloads from running)
- Block direct PHP access to `/wp-includes/*.php`
- Block sensitive files: `readme.html`, `license.txt`, `wp-config-sample.php`, `wp-admin/install.php`, `wp-admin/maint/repair.php`
- Block dotfile access (except `.well-known/`)
- Block `?author=N` enumeration via 301 to home
- Rate-limit `/wp-login.php` to 5 r/min with burst 20 (429 when exceeded). Behind the StartOS edge proxy `$binary_remote_addr` is the edge IP, so this acts as a global cap rather than per-client — still defeats password-spray scripts.
- Security response headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: interest-cohort=()`, `Strict-Transport-Security: max-age=31536000`

**`wp-config.php` (generated per site):**

- `WP_DEBUG = false`, `WP_DEBUG_DISPLAY = false`, `WP_DEBUG_LOG = false`
- `WP_AUTO_UPDATE_CORE = false` (the package controls core version)
- `FORCE_SSL_ADMIN = true`
- `DISALLOW_FILE_EDIT = true` (no theme/plugin editor in admin)
- `$_SERVER['HTTPS'] = 'on'` forced (StartOS edge terminates TLS; without this WordPress's `is_ssl()` disagrees with the URLs we emit and `/wp-admin` redirect-loops)
- File mode `600`, owned by `www-data`
- 64-char auth keys and salts generated fresh per site

**Bundled mu-plugin (`wp-content/mu-plugins/start9-security.php`, copied into every site, can't be disabled from the admin UI):**

- Disable XML-RPC at the application layer (defense in depth alongside the nginx block)
- Remove the REST API `/wp/v2/users` endpoint (it leaks usernames to unauthenticated requests)
- Redirect `?author=N` to home (application-layer pair to the nginx block)
- Strip the WP version from `<meta generator>`, feeds, and `?ver=` query strings on enqueued CSS/JS

**PHP:**

- `expose_php = Off`, `display_errors = Off`, `display_startup_errors = Off` (errors logged only)
- `session.cookie_httponly = 1`, `session.cookie_secure = 1`, `session.use_strict_mode = 1`

**Database:**

- MariaDB binds `127.0.0.1` only; never network-exposed
- Each site lives in its own database schema (`wp_<site-id>`); no cross-site SQL access

**Application:**

- Admin username is a 16-char random string (generated when the site row is created) — defeats the `admin` username assumption used by brute-force scripts
- Admin password is a 32-char random string; revealed only via the **Show Admin Credentials** action

**Known limitations:**

- Per-IP rate limiting is approximate behind the StartOS edge proxy (acts as a global cap rather than per-client)
- WAF-style request inspection is not bundled (no ModSecurity / Wordfence-equivalent)
- 2FA is not enforced at the package level — admins should install a 2FA plugin (Wordfence Login Security, Two-Factor, etc.) for high-value sites

## Limitations

- WordPress core version is pinned per package release. To upgrade WP, bump the package.
- Plugins and themes are managed entirely through the WP admin UI — there is no StartOS action surface for them.
- Removing a site through Manage Sites currently leaves the site directory and its DB schema behind. A cleanup pass is on the roadmap.
- SMTP is not yet wired in. Outbound mail (password resets, member signup, etc.) will not work until that's added.
- All sites share the MariaDB root user inside the loopback boundary; per-site DB users are on the roadmap.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for build instructions and development workflow.

## Quick Reference for AI Consumers

```yaml
package_id: wordpress
images:
  wordpress: dockerBuild (Alpine 3.21 + nginx + PHP 8.3-FPM + wp-cli + WordPress 7.0)
  mariadb: mariadb:11.8.7
architectures: [x86_64, aarch64]
volumes:
  main: /data         # /data/sites/<id>/, /data/store.json
  mysql: /var/lib/mysql
internal_ports:
  per_site: 8000+     # one per site, dynamically allocated
  php_fpm: 9000
multihosts: one per site (id = site id)
interfaces_per_site:
  - "<site-id>-site"  (path: '/')
  - "<site-id>-admin" (path: '/wp-admin/')
dependencies: none
actions:
  - manage
  - show-admin-credentials
state:
  store_json_keys: [dbRootPassword, sites[id, port, name, adminUser, adminPassword, adminEmail]]
  filesystem_markers: /data/sites/<id>/.installed
migrations: via WordPress plugins inside a fresh site (no StartOS-side import action)
```
