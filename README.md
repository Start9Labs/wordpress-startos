<p align="center">
  <img src="icon.svg" alt="WordPress Logo" width="21%">
</p>

# WordPress on StartOS

> Everything not listed in this document should behave the same as upstream
> WordPress. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[WordPress](https://github.com/WordPress/WordPress) is a web publishing platform. This package hosts any number of independent WordPress sites side by side, each with its own database, addresses and admin account, on one shared web server, PHP runtime and MariaDB.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Two images: a custom `wordpress` image built from this repo's `Dockerfile` (Alpine with nginx, PHP-FPM, wp-cli and a bundled WordPress core), and the unmodified upstream `mariadb` image. Both run on x86_64 and aarch64.

| Subcontainer           | Image       | Runs                                                                                               |
| ---------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| `mariadb-sub`          | `mariadb`   | MariaDB, bound to `127.0.0.1` only                                                                 |
| `setup-sub`            | `wordpress` | `setup-sites` oneshot (`wp-setup.sh`): installs new sites, upgrades installed ones                 |
| `php-fpm-sub`          | `wordpress` | PHP-FPM on `127.0.0.1:9000`                                                                        |
| `nginx-sub`            | `wordpress` | nginx, one server block per site                                                                   |
| `wp-cron-sub`          | `wordpress` | A loop that runs `wp cron event run --due-now` as `www-data` for every active site every 5 minutes |
| `reset-admin-password` | `wordpress` | Temporary; exists only while **Reset Admin Password** runs                                         |

The bundled core lives in the image at `/usr/local/share/wordpress-core` and is copied into a site's directory when the site is installed or upgraded.

## Volume and Data Layout

Two volumes: one for site files and package state, one for the database.

| Volume  | Mount point      | Contents                                                                            |
| ------- | ---------------- | ----------------------------------------------------------------------------------- |
| `main`  | `/data`          | `store.json` (package state) and `sites/<site-id>/`, one WordPress install per site |
| `mysql` | `/var/lib/mysql` | MariaDB data directory; each site has its own schema, `wp_<site-id>`                |

Each `/data/sites/<site-id>/` holds WordPress core, `wp-config.php`, `wp-content/` (themes, plugins, uploads), and three package markers: `.installed` (site setup finished), `.core-upgrade-pending` (a core upgrade is in progress and will be retried) and `.primary-url`.

## File Models

The package owns `store.json` and generates several files from it. Which of them a hand edit survives differs by file.

- **`/data/store.json`** (file model) — the MariaDB root password, generated once at install, and the site registry: each site's `id`, internal `port`, `name`, admin username, email and last generated password, `primaryUrl`, and `adminPasswordRevealed`. Written only by init and the actions. A site's `id` and `port` never change once assigned.
- **`/data/sites/<site-id>/wp-config.php`** — written once, when the site is installed, with per-site 64-character keys and salts, mode `600`, owned by `www-data`. Nothing rewrites it afterwards, so a hand edit survives. It derives `WP_HOME`/`WP_SITEURL` from the request's `Host` header, falling back to `.primary-url` outside a request, and sets `$_SERVER['HTTPS'] = 'on'`, `FORCE_SSL_ADMIN`, `DISALLOW_FILE_EDIT`, `DISABLE_WP_CRON`, `WP_AUTO_UPDATE_CORE = false` and debug output off.
- **`/data/sites/<site-id>/.primary-url`** — rewritten from `store.json` on every start. A hand edit is reverted; use **Set Primary URL**.
- **`wp-content/mu-plugins/start9-security.php`** — re-copied from the image into every site on every start. A hand edit is overwritten.
- **nginx server blocks** (`/etc/nginx/http.d/sites.conf`) and the cron site list (`/etc/wp-cron-sites`) — regenerated inside the subcontainers on every start, never on a volume. They can't be edited.

MariaDB receives the root password as `MARIADB_ROOT_PASSWORD` on every launch, but the image applies it only when it initializes an empty data directory. The password is generated once and never rotated, so the two never disagree.

## Dependencies

None. MariaDB is bundled as a subcontainer.

## Network Access and Interfaces

Every site gets its own MultiHost, whose id is the site id, bound to the site's internal HTTP port (`8000`, `8001`, … in creation order), and two `ui` interfaces that share its addresses:

| Interface id      | Path         | Serves                        |
| ----------------- | ------------ | ----------------------------- |
| `<site-id>-site`  | `/`          | The public site               |
| `<site-id>-admin` | `/wp-admin/` | The WordPress admin dashboard |

StartOS terminates TLS and forwards plain HTTP to the site's port. WordPress answers on any hostname the user adds to the site, with no configuration inside WordPress. nginx's catch-all server on port `80` drops any request that matches no site (`444`); it is not exported.

## Installation and First-Run Flow

Installing creates no site. Sites are added afterwards and set up by the next start.

1. Init generates the MariaDB root password into `store.json`.
2. With no sites, a critical task holds the service until **Manage Sites** adds one.
3. Saving a new row assigns a random 12-character site id, the next free internal port, a random 16-character admin username and a random 32-character password. Nothing is installed yet.
4. The registry change restarts the daemons. `setup-sites` finds the site has no `.installed` marker, creates its schema, copies in core, writes `wp-config.php`, runs `wp core install`, and drops the marker.
5. An important task asks the user to run **Reset Admin Password** for the site. That is how the admin password is first shown.

## Actions

Three actions, all visible to the user. **Set Primary URL** and **Reset Admin Password** stay hidden until a site exists.

- **Manage Sites** — run to add, rename or remove sites. Adding or removing a site restarts every site while the daemon chain restarts. A new site is usable once `setup-sites` finishes. Renaming changes only interface labels and restarts nothing. Removing a site deletes its interfaces and clears its password task, and it leaves `/data/sites/<site-id>/` and the `wp_<site-id>` schema on disk; there is no way to reattach them. Repeating with the same rows changes nothing.
- **Set Primary URL** — run when cron jobs, scheduled posts or emails produce links to `http://localhost`. It picks one of a site's own addresses as that site's URL outside an HTTP request, written to `.primary-url` on the next start. Requests always use their own `Host` header, whatever is set here. The choices are the site's non-local addresses, so a site with none can't be set. Saving restarts every site.
- **Reset Admin Password** — run for the first sign-in to a new site, or to recover a lost password. It needs the service running. Each run sets a new random password through wp-cli and returns the username and password; the previous password stops working. It changes only that one site and restarts nothing. It overwrites a password the user set inside WordPress.

## Tasks

The package raises two kinds of task, both on its own page.

- **Add your first WordPress site!** — critical: the service can't start while it stands. Raised at init whenever the site registry is empty. **Manage Sites** with at least one row clears it. It comes back if every site is later removed.
- **Set the admin password for `<site name>`** — important, one per site. Raised at init for each site whose admin password has never been revealed, with that site preselected. Only a successful **Reset Admin Password** for that site clears it, and a site whose password has been revealed never raises it again. A failed reset leaves it standing, and resetting one site leaves the other sites' tasks standing. Removing the site clears it.

## Health Checks

Four checks, one per long-running daemon.

| Check id  | Display     | Probes                                | A failure means                                                                                                       |
| --------- | ----------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `mariadb` | Database    | `SELECT 1` as root over `127.0.0.1`   | "Initializing database…" is normal on first start. If it persists, MariaDB is not starting; check its logs.           |
| `php-fpm` | PHP Runtime | Port `9000` listening                 | PHP-FPM failed to start; every site returns 502. It waits on `setup-sites`, so a failing setup shows up here first.   |
| `nginx`   | Web Server  | The **first** site's port listening   | nginx is not serving. With no sites it reports success with a reminder to add one. Other sites' ports are not probed. |
| `wp-cron` | Scheduler   | Nothing; reports success once running | Cannot fail by itself. Scheduled events not firing points at a missing `.installed` marker or a failing site.         |

## Backups and Restore

Both volumes are copied wholesale (`ofVolumes('main', 'mysql')`); MariaDB is captured as its data directory, not dumped.

A backup holds every site's files and every site's schema, including the files and schemas of removed sites. A restored instance needs nothing re-entered: the registry, root password and per-site config come back with the volumes, and the next start runs `setup-sites` over the restored sites as usual.

## Limitations and Differences

1. **No outgoing mail.** SMTP is not configured; password-reset, comment and signup emails are not sent.
2. **Removing a site leaves its data behind.** Its directory and schema stay on disk and in backups, with no action to delete or reattach them.
3. **Sites share one database login.** Every site connects as the MariaDB root user; separate schemas are not an isolation boundary between sites.
4. **Core is pinned by the package.** WordPress's own core auto-update is off. A package update copies the bundled core into every site whose core is older, preserving `wp-config.php` and `wp-content/`, and runs `wp core update-db`; a site updated to a newer core from the admin is not downgraded. Plugins and themes are managed only from the WordPress admin.
5. **XML-RPC is disabled**, in nginx and in the bundled mu-plugin. Pingbacks, trackbacks and remote-publishing clients that use XML-RPC do not work.
6. **Hardening differs from a stock install.** The theme and plugin file editor is disabled. The REST `/wp/v2/users` endpoint is removed, `?author=N` redirects to the home page, and the WordPress version is stripped from generator tags, feeds and asset URLs. PHP files under `wp-content/uploads/` and `wp-includes/` cannot be executed directly, and `readme.html`, `license.txt`, `wp-config-sample.php`, `wp-admin/install.php`, `wp-admin/maint/repair.php` and dotfiles return 403. Responses carry `nosniff`, `SAMEORIGIN`, a strict referrer policy and HSTS. PHP hides its version and errors, and session cookies are `HttpOnly` and `Secure` with strict session-ID mode.
7. **Login rate limiting is global.** `/wp-login.php` is limited to 5 requests a minute (burst 20), keyed on the client address — which behind the StartOS proxy is the proxy's, so the limit is shared by every visitor rather than per client.
8. **WP-Cron runs on a schedule, not on page loads.** Due events run every 5 minutes as `www-data`, so an event can fire up to 5 minutes late.
9. **No WAF and no enforced 2FA.** Add a security or two-factor plugin from the WordPress admin if a site needs one.
10. **Migration goes through WordPress plugins.** There is no import action; restore an export into a new site with a migration plugin such as All-in-One WP Migration, Duplicator or UpdraftPlus.

---

## Quick Reference for AI Consumers

```yaml
package_id: wordpress
image: wordpress (dockerBuild), mariadb
architectures: [x86_64, aarch64]
subcontainers:
  [
    mariadb-sub,
    setup-sub,
    php-fpm-sub,
    nginx-sub,
    wp-cron-sub,
    reset-admin-password,
  ]
volumes:
  main: /data
  mysql: /var/lib/mysql
file_models:
  - /data/store.json
startos_managed_env_vars:
  - MARIADB_ROOT_PASSWORD
dependencies: none
interfaces: # per site; MultiHost id = site id, port = 8000 + n
  <site-id>-site: { type: ui, port: 8000 }
  <site-id>-admin: { type: ui, port: 8000 }
actions:
  - manage
  - set-primary-url
  - reset-admin-password
tasks:
  - { action: manage, severity: critical }
  - { action: reset-admin-password, severity: important }
health_checks:
  - mariadb
  - php-fpm
  - nginx
  - wp-cron
```
