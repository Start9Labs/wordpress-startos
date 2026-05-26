# WordPress

WordPress on StartOS lets you run any number of independent WordPress sites side by side. Each site has its own database, its own hostnames, and its own admin login. There is nothing to set up at the package level — all the work happens on a **per-site** basis through the **Actions** tab.

## Adding your first site

1. Open the **Actions** tab and click **Manage Sites**.
2. Click **+** to add a row and give the site a short name (e.g. "Blog", "Marketing"). The name is only used for labelling — it doesn't have to match a domain.
3. Click **Save**. The package will provision the database, lay down WordPress, and run the installer in the background. After a few seconds a new entry appears on the **Dashboard** tab.

You can add as many sites as you want at once. Each row becomes its own independent site.

## Logging in

Each site has an auto-generated admin user. To find the credentials:

1. Open the **Actions** tab and click **Show Admin Credentials**.
2. Select the site you want to log in to.
3. Copy the username and password.
4. Open the site from the **Dashboard** tab and append `/wp-admin` to the URL — that's where you sign in.

Treat these credentials like any other password. You can rotate the password from inside WordPress's profile screen once you've logged in.

## Adding a hostname (Tor, LAN, custom domain)

When you create a site, StartOS gives it a default `.onion` and a `.local` address. To browse to it from another machine:

1. From the **Dashboard**, open the site's interface.
2. Click the interface name to see the list of hostnames StartOS has bound to it.
3. Copy whichever address you want to use.

To add a custom domain, follow the standard StartOS domain flow on the site's interface page. The site will start responding on the new hostname immediately — no further configuration inside WordPress is required.

## Importing an existing WordPress site

You can import a WordPress backup from another host. Two pieces are needed:

- the `wp-content/` directory (themes, plugins, uploads)
- the database as a `.sql` dump at the root of the archive

Combine them into a single `.tar.gz`, `.tar`, or `.zip` archive.

1. Install the **File Browser** package if you don't have it.
2. Upload your archive into File Browser. Note its path inside File Browser (e.g. `wordpress-exports/my-old-site.tar.gz`).
3. In WordPress, open the **Actions** tab and click **Import Site**.
4. Give it a name and paste the archive path. Click **Save**.

The package will extract the archive, import the database, and rewrite the configuration so the site is reachable on whatever hostname you bind to it.

After the import completes, you can find the new site on the **Dashboard**. The original site's admin credentials still work — the auto-generated ones are reserved as a backup. If you want to look them up, use the **Show Admin Credentials** action.

## Removing a site

In **Manage Sites**, delete the row for the site and save. The interface disappears from the dashboard. Note: the underlying data (files and database) is left on disk for now — a future package update will clean it up. If you want to reclaim the space immediately, you can do so via File Browser by removing `/data/sites/<id>/` on the wordpress volume.

## Limitations

- **No SMTP.** Password resets, comment notifications, and membership signups that rely on outgoing mail won't work yet.
- **Plugins and themes go through WordPress itself.** There are no StartOS actions for them — install them from the WP admin UI as you normally would.
- **All sites move together on update.** When you update the package, every site is upgraded to the new WordPress core version.
