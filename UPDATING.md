# Updating the upstream version

This package wraps [WordPress](https://github.com/WordPress/WordPress). Each package release pins a specific WordPress core version (downloaded by the `Dockerfile`'s `ARG WORDPRESS_VERSION`) and a specific MariaDB image (`mariadb:<x.y.z>` in `startos/manifest/index.ts`).

## Determining the upstream version

- **WordPress core** — current stable from the WordPress version-check endpoint:

  ```sh
  curl -s 'https://api.wordpress.org/core/version-check/1.7/' \
    | jq -r '.offers[0].version'
  ```

- **MariaDB** — current LTS tag on Docker Hub. Check what `mariadb:lts` resolves to and pin the exact `<major>.<minor>.<patch>` form rather than the moving tag.

## Applying the bump

- **WordPress core**: bump `ARG WORDPRESS_VERSION` in `Dockerfile`. Optionally update `ARG WORDPRESS_SHA256` to the published checksum from `https://wordpress.org/wordpress-<version>.tar.gz.sha256`.
- **MariaDB**: bump `images.mariadb.source.dockerTag` in `startos/manifest/index.ts`.
- **Package release version**: rename the file in `startos/versions/` to the new `<wp-version>_<package-rev>` form, update its `version` and `releaseNotes`. Add the prior version to `other: []` in `startos/versions/index.ts` *only* if you need a migration (this package's data layout has been stable across versions so far — no migrations needed for a routine bump).

## Verifying

```sh
make x86
```

For a release that includes a WP major version bump, also boot a fresh install on a test VM and confirm:

- `wp core install` succeeds on a brand-new site.
- An older site survives the bump (no DB schema breakage). `wp core update-db` runs automatically as part of the install path; for already-installed sites, log in and trust WP's "Database Update Required" prompt.
