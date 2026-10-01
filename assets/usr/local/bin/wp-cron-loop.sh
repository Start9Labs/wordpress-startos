#!/bin/bash
# Drive wp-cron from inside the container instead of letting WordPress fire it
# via a loopback HTTP request on every page load. The loopback approach hangs
# page responses when the public hostname can't resolve from inside the
# container (DNS propagation, cert provisioning, NAT loops, etc.), which is
# what the user sees as "the site times out after changing the public domain".
#
# Runs continuously: every $WP_CRON_INTERVAL seconds, dispatches due events
# for every installed site. Idempotent — sites without a .installed marker
# are skipped, and wp-cli errors don't bring the loop down.
set -eu

: "${WP_CRON_SITES:=/etc/wp-cron-sites}"
: "${WP_CRON_INTERVAL:=300}"

while true; do
  while IFS= read -r site_dir; do
    [ -d "$site_dir" ] || continue
    [ -f "$site_dir/.installed" ] || continue
    wp --path="$site_dir" cron event run --due-now 2>&1 || true
  done < "$WP_CRON_SITES"
  sleep "$WP_CRON_INTERVAL"
done
