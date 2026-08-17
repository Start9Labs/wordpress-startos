<?php
/**
 * Plugin Name: Start9 Security Hardening
 * Description: Baseline hardening applied to every site by wordpress-startos.
 *              Disables XML-RPC, hides the REST API users endpoint, blocks
 *              author enumeration, and strips the WP version from output.
 * Author:      wordpress-startos
 * Version:     1.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Disable XML-RPC at the application layer (nginx blocks it too; this is
// defense in depth in case the proxy is reconfigured).
add_filter( 'xmlrpc_enabled', '__return_false' );

// Remove the REST API users endpoint — it leaks usernames to unauthenticated
// requests. Logged-in admins still have full access through wp-admin.
add_filter( 'rest_endpoints', function ( $endpoints ) {
    foreach ( array(
        '/wp/v2/users',
        '/wp/v2/users/(?P<id>[\d]+)',
    ) as $route ) {
        if ( isset( $endpoints[ $route ] ) ) {
            unset( $endpoints[ $route ] );
        }
    }
    return $endpoints;
} );

// Block author-archive enumeration (?author=N → username via 301 Location).
add_action( 'init', function () {
    if ( is_admin() ) {
        return;
    }
    if ( isset( $_GET['author'] ) ) {
        wp_safe_redirect( home_url(), 301 );
        exit;
    }
} );

// Strip the WP version from <meta> generator and from RSS/Atom feeds.
remove_action( 'wp_head', 'wp_generator' );
add_filter( 'the_generator', '__return_empty_string' );

// Don't leak the WP version on enqueued asset URLs (?ver=X.Y).
add_filter( 'style_loader_src',  function ( $src ) { return remove_query_arg( 'ver', $src ); }, 9999 );
add_filter( 'script_loader_src', function ( $src ) { return remove_query_arg( 'ver', $src ); }, 9999 );
