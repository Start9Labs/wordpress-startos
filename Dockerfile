FROM alpine:3.24

ARG WORDPRESS_VERSION=7.1.3
ARG WORDPRESS_SHA1=491a78c7676b15dffcc69130c6054b8f49228a91

RUN apk add --no-cache \
      nginx \
      nginx-mod-http-brotli \
      php83 \
      php83-fpm \
      php83-mysqli \
      php83-pdo_mysql \
      php83-gd \
      php83-curl \
      php83-mbstring \
      php83-xml \
      php83-zip \
      php83-intl \
      php83-bcmath \
      php83-exif \
      php83-fileinfo \
      php83-iconv \
      php83-tokenizer \
      php83-opcache \
      php83-dom \
      php83-simplexml \
      php83-xmlreader \
      php83-xmlwriter \
      php83-session \
      php83-sodium \
      php83-phar \
      php83-openssl \
      php83-ctype \
      php83-json \
      php83-posix \
      mariadb-client \
      mariadb-connector-c \
      curl \
      ca-certificates \
      jq \
      tar \
      gzip \
      unzip \
      bash \
      coreutils \
      shadow

RUN sed -i '/emSign_/s/^/!/' /etc/ca-certificates.conf && \
    update-ca-certificates

RUN ln -sf /usr/bin/php83 /usr/local/bin/php && \
    addgroup -S -g 82 www-data 2>/dev/null || true && \
    adduser -S -D -H -u 82 -G www-data -s /sbin/nologin www-data 2>/dev/null || true

RUN curl -fsSLo /usr/local/bin/wp \
      https://github.com/wp-cli/wp-cli/releases/download/v2.12.0/wp-cli-2.12.0.phar && \
    echo "be928f6b8ca1e8dfb9d2f4b75a13aa4aee0896f8a9a0a1c45cd5d2c98605e6172e6d014dda2e27f88c98befc16c040cbb2bd1bfa121510ea5cdf5f6a30fe8832  /usr/local/bin/wp" | sha512sum -c - && \
    chmod +x /usr/local/bin/wp

RUN curl -fsSLo /tmp/wp.tar.gz \
      "https://wordpress.org/wordpress-${WORDPRESS_VERSION}.tar.gz" && \
    echo "${WORDPRESS_SHA1}  /tmp/wp.tar.gz" | sha1sum -c - && \
    mkdir -p /usr/local/share/wordpress-core && \
    tar -xzf /tmp/wp.tar.gz -C /usr/local/share/wordpress-core --strip-components=1 && \
    rm /tmp/wp.tar.gz

COPY assets/etc/nginx/nginx.conf /etc/nginx/nginx.conf
COPY assets/etc/php83/php-fpm.d/wordpress.conf /etc/php83/php-fpm.d/www.conf
COPY assets/etc/php83/conf.d/wordpress.ini /etc/php83/conf.d/99-wordpress.ini
COPY assets/usr/local/bin/wp-setup.sh /usr/local/bin/wp-setup.sh
COPY assets/usr/local/bin/wp-cron-loop.sh /usr/local/bin/wp-cron-loop.sh

# Bundled mu-plugins that get copied into every new site alongside core.
COPY assets/usr/local/share/wordpress-core-overlay/ /usr/local/share/wordpress-core/

RUN chmod 755 /usr/local/bin/wp-setup.sh /usr/local/bin/wp-cron-loop.sh && \
    chmod -R a+rX /etc/nginx /etc/php83 /usr/local/share/wordpress-core

RUN mkdir -p /run/nginx /var/log/nginx /etc/nginx/http.d && \
    rm -f /etc/nginx/http.d/default.conf

CMD ["/bin/sh"]
