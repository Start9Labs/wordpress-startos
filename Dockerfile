FROM alpine:3.21

ARG WORDPRESS_VERSION=7.0
ARG WORDPRESS_SHA256=

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
      jq \
      tar \
      gzip \
      unzip \
      bash \
      coreutils \
      shadow

RUN ln -sf /usr/bin/php83 /usr/local/bin/php && \
    addgroup -S -g 82 www-data 2>/dev/null || true && \
    adduser -S -D -H -u 82 -G www-data -s /sbin/nologin www-data 2>/dev/null || true

RUN curl -fsSLo /usr/local/bin/wp \
      https://github.com/wp-cli/wp-cli/releases/download/v2.12.0/wp-cli-2.12.0.phar && \
    chmod +x /usr/local/bin/wp

RUN curl -fsSLo /tmp/wp.tar.gz \
      "https://wordpress.org/wordpress-${WORDPRESS_VERSION}.tar.gz" && \
    mkdir -p /usr/local/share/wordpress-core && \
    tar -xzf /tmp/wp.tar.gz -C /usr/local/share/wordpress-core --strip-components=1 && \
    rm /tmp/wp.tar.gz

COPY assets/etc/nginx/nginx.conf /etc/nginx/nginx.conf
COPY assets/etc/php83/php-fpm.d/wordpress.conf /etc/php83/php-fpm.d/www.conf
COPY assets/etc/php83/conf.d/wordpress.ini /etc/php83/conf.d/99-wordpress.ini
COPY assets/usr/local/bin/wp-setup.sh /usr/local/bin/wp-setup.sh

# Bundled mu-plugins that get copied into every new site alongside core.
COPY assets/usr/local/share/wordpress-core-overlay/ /usr/local/share/wordpress-core/

RUN chmod +x /usr/local/bin/wp-setup.sh

RUN mkdir -p /run/nginx /var/log/nginx /etc/nginx/http.d && \
    rm -f /etc/nginx/http.d/default.conf

CMD ["/bin/sh"]
