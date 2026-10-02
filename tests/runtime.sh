#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

name="wordpress-test-$(date +%s)-$$"
image="$name:latest"
password=$(openssl rand -hex 24)
cleanup() {
  docker rm -f "$name-db" >/dev/null 2>&1 || true
  docker volume rm "$name-data" "$name-db" >/dev/null 2>&1 || true
  docker image rm "$image" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build -t "$image" .
docker run -d --name "$name-db" -e "MARIADB_ROOT_PASSWORD=$password" \
  -v "$name-db:/var/lib/mysql" mariadb:11.8.7 --bind-address=0.0.0.0 >/dev/null

docker run --rm -i --network "container:$name-db" \
  -v "$name-data:/data" -e "DB_ROOT_PASSWORD=$password" -e DB_HOST=127.0.0.1 \
  -e STORE_PATH=/data/store.json -e SITES_ROOT=/data/sites "$image" bash -s <<'TEST'
set -euo pipefail
jq -n '{sites: [
  {id: "alpha", name: "Alpha", adminUser: "admin_alpha", adminPassword: "temporary-test-password", adminEmail: "admin@example.test", primaryUrl: "https://example.test"},
  {id: "beta", name: "Beta", adminUser: "admin_beta", adminPassword: "temporary-test-password", adminEmail: "admin@example.test", primaryUrl: null}
]}' > "$STORE_PATH"
/usr/local/bin/wp-setup.sh
site=/data/sites/alpha
core=/usr/local/share/wordpress-core
want=$(wp --path="$core" --allow-root core version)
wp --path="$site" --allow-root core is-installed
php -l "$site/wp-config.php"
test "$(cat "$site/.primary-url")" = https://example.test
cp "$site/wp-config.php" /tmp/original-config
mkdir -p "$site/wp-content/uploads" "$site/wp-content/plugins/keep"
echo retained > "$site/wp-content/uploads/keep.txt"
echo retained > "$site/wp-content/plugins/keep/data.txt"

# Exercise the production config writer independently of database provisioning.
source <(awk '/^wait_for_db$/ {exit} {print}' /usr/local/bin/wp-setup.sh)
mkdir -p /tmp/config-test
for _ in $(seq 1 128); do
  write_wp_config /tmp/config-test wp_test
  php -l /tmp/config-test/wp-config.php >/dev/null
done

sed -i "s/\$wp_version = '[^']*'/\$wp_version = '6.9'/" "$site/wp-includes/version.php"
rm -rf "$site/wp-content/mu-plugins"
/usr/local/bin/wp-setup.sh
test "$(wp --path="$site" --allow-root core version)" = "$want"
test -f "$site/wp-content/mu-plugins/start9-security.php"
test "$(stat -c %U "$site/wp-settings.php")" = www-data
cmp "$site/wp-config.php" /tmp/original-config
test "$(cat "$site/wp-content/uploads/keep.txt")" = retained
test "$(cat "$site/wp-content/plugins/keep/data.txt")" = retained

sed -i "s/\$wp_version = '[^']*'/\$wp_version = '6.9'/" "$site/wp-includes/version.php"
mkdir -p /tmp/fail-wp
printf '#!/bin/bash\nif [[ "$*" == *"core update-db"* ]]; then exit 42; fi\nexec /usr/local/bin/wp "$@"\n' > /tmp/fail-wp/wp
chmod +x /tmp/fail-wp/wp
if PATH="/tmp/fail-wp:$PATH" /usr/local/bin/wp-setup.sh; then
  echo 'Expected schema upgrade failure' >&2
  exit 1
fi
test -f "$site/.core-upgrade-pending"
test "$(wp --path="$site" --allow-root core version)" = "$want"
echo interrupted > "$site/wp-settings.php"
/usr/local/bin/wp-setup.sh
test ! -f "$site/.core-upgrade-pending"
cmp "$site/wp-settings.php" "$core/wp-settings.php"

touch "$site/.core-upgrade-pending"
printf '<?php broken syntax' > "$site/wp-includes/version.php"
/usr/local/bin/wp-setup.sh
test ! -f "$site/.core-upgrade-pending"
cmp "$site/wp-includes/version.php" "$core/wp-includes/version.php"
sed -i "s/\$wp_version = '[^']*'/\$wp_version = '7.0-beta1'/" "$site/wp-includes/version.php"
/usr/local/bin/wp-setup.sh
test "$(wp --path="$site" --allow-root core version)" = "$want"

# Wrapper-only releases must refresh their mu-plugin without replacing user content.
echo stale > "$site/wp-content/mu-plugins/start9-security.php"
/usr/local/bin/wp-setup.sh
cmp "$site/wp-content/mu-plugins/start9-security.php" "$core/wp-content/mu-plugins/start9-security.php"

sed -i "s/\$wp_version = '[^']*'/\$wp_version = '7.9'/" "$site/wp-includes/version.php"
cp "$site/wp-includes/version.php" /tmp/newer-version
/usr/local/bin/wp-setup.sh
cmp "$site/wp-includes/version.php" /tmp/newer-version

cp "$core/wp-includes/version.php" "$site/wp-includes/version.php"
cat > "$site/wp-content/mu-plugins/test-cron.php" <<'PHP'
<?php
add_action('helix_test_cron', function () {
    file_put_contents(__DIR__ . '/../uploads/cron-result.txt', 'ran');
});
PHP
chown -R www-data:www-data "$site"
wp --path="$site" --allow-root cron event schedule helix_test_cron now
mkdir -p /data/sites/removed
touch /data/sites/removed/.installed
printf '%s\n' "$site" > /etc/wp-cron-sites
set +e
timeout 5s su -s /bin/sh www-data -c \
  'WP_CLI_CACHE_DIR=/tmp/wp-cli-cache WP_CRON_INTERVAL=60 /usr/local/bin/wp-cron-loop.sh' > /tmp/cron-log 2>&1
status=$?
set -e
test "$status" = 124
cat /tmp/cron-log
test "$(cat "$site/wp-content/uploads/cron-result.txt")" = ran
test "$(stat -c %U "$site/wp-content/uploads/cron-result.txt")" = www-data
! grep -q '/removed' /tmp/cron-log

echo 'Runtime regressions passed: config syntax, fresh sites, core upgrade, retry, content preservation, no downgrade, bundled plugins, unprivileged cron, inactive-site exclusion'
TEST
