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

The package creates **one MultiHost and one Interface per site**, identified by the site's internal `id`. Hostnames (Tor `.onion`, `.local`, custom domains) are managed through the StartOS UI on each interface. Internally each site listens on its own port (`8000`, `8001`, …) — StartOS routes external hostnames to that port.

| Source              | Internal port | External                                  |
| ------------------- | ------------- | ----------------------------------------- |
| Site 1              | 8000          | Hostnames added by user to the interface  |
| Site 2              | 8001          | Hostnames added by user to the interface  |
| …                   | 8002+         | …                                         |
| Default (catch-all) | 80            | Refuses unknown traffic (`return 444`)    |

## Actions (StartOS UI)

| Action                        | Purpose                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| **Manage Sites**              | List editor: add new sites by adding rows, rename in place, remove by deleting rows.     |
| **Import Site**               | Import an existing WordPress install from a `.tar.gz`/`.tar`/`.zip` archive in File Browser. |
| **Show Admin Credentials**    | Reveal the auto-generated admin username and password for a chosen site.                 |

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

| Dependency      | Kind       | Required when                  |
| --------------- | ---------- | ------------------------------ |
| `filebrowser`   | `exists`   | A site has a pending import.   |

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
dependencies:
  filebrowser: { kind: exists, condition: "site has pending import" }
actions:
  - manage
  - import-site
  - show-admin-credentials
state:
  store_json_keys: [dbRootPassword, sites[id, port, name, adminUser, adminPassword, adminEmail, pendingImport]]
  filesystem_markers: /data/sites/<id>/.installed
```
