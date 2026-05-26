# WordPress

WordPress on StartOS lets you run any number of independent WordPress sites side by side. Each site has its own database, its own hostnames, and its own admin login. There is nothing to set up at the package level — all the work happens on a **per-site** basis through the **Actions** tab.

## Adding your first site

1. Open the **Actions** tab and click **Manage Sites**.
2. Click **+** to add a row and give the site a short name (e.g. "Blog", "Marketing"). The name is only used for labelling — it doesn't have to match a domain.
3. Click **Save**. The package will provision the database, lay down WordPress, and run the installer in the background. After a few seconds a new entry appears on the **Dashboard** tab.

You can add as many sites as you want at once. Each row becomes its own independent site.

## Logging in

Each site has an auto-generated admin user, but the password is only revealed when you ask for one. The package never displays a stale password — every time you run **Set/Reset Admin Password**, it picks a new random password, pushes it into WordPress, and shows it to you.

To sign in to a fresh site:

1. Open the **Actions** tab and click **Set/Reset Admin Password**.
2. Select the site you want.
3. Copy the username and password it returns.
4. Go back to the **Dashboard** and open the `<site name> (admin)` interface — it lands directly on the WordPress login page. Paste the credentials there.

Each site has two interfaces on the Dashboard sharing the same hostnames:

- **`<site name>`** — the public site, opens at `/`.
- **`<site name> (admin)`** — the WordPress admin dashboard, opens at `/wp-admin/`.

If you lose access — forgot the password, changed it inside WordPress and forgot the new one, etc. — run **Set/Reset Admin Password** again. It replaces whatever password is currently set with a new one and shows it to you. You can also change the password from inside WordPress's profile screen, but if you do, the package won't know about your new password (you're on your own to remember it); the reset action is the only escape hatch.

## Adding a hostname (Tor, LAN, custom domain)

When you create a site, StartOS gives it a default `.onion` and a `.local` address. To browse to it from another machine:

1. From the **Dashboard**, open the site's interface.
2. Click the interface name to see the list of hostnames StartOS has bound to it.
3. Copy whichever address you want to use.

To add a custom domain, follow the standard StartOS domain flow on the site's interface page. The site will start responding on the new hostname immediately — no further configuration inside WordPress is required.

## Importing an existing WordPress site

Migrations go through WordPress's own plugin ecosystem rather than a StartOS action:

1. Create a fresh site here through **Manage Sites**.
2. Log into its WP admin (see *Logging in* above).
3. Install a migration plugin — **All-in-One WP Migration**, **Duplicator**, **BackupBuddy**, **UpdraftPlus**, etc. — and use its restore flow to import your backup from the old host.

Each of those plugins handles the database, files, and URL rewriting in its own way; their restore wizards know exactly what their export format looks like and will do the right thing.

## Removing a site

In **Manage Sites**, delete the row for the site and save. The interface disappears from the dashboard. Note: the underlying data (files and database) is left on disk for now — a future package update will clean it up. If you want to reclaim the space immediately, you can do so via File Browser by removing `/data/sites/<id>/` on the wordpress volume.

## Limitations

- **No SMTP.** Password resets, comment notifications, and membership signups that rely on outgoing mail won't work yet.
- **Plugins and themes go through WordPress itself.** There are no StartOS actions for them — install them from the WP admin UI as you normally would.
- **All sites move together on update.** When you update the package, every site is upgraded to the new WordPress core version.
