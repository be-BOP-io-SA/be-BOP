#!/usr/bin/env bash
set -eo pipefail

# This directory stores temporary configuration files before installing.
NEWCONFIG_TMPDIR="/var/lib/be-BOP/new-config"

# This directory stores scripts to run at a later time, in order to
# complete a configuration process. This is necessary because when
# bebop-wizard is run by the maintainer scripts, it's not possible to
# install software within a transaction.
DEFER_SCRIPTS_DIR="/var/lib/bebop-wizard/deferred"

defer_install() {
    mkdir -p "$DEFER_SCRIPTS_DIR"
    TARGET="$DEFER_SCRIPTS_DIR/run-install"
    if [ ! -f "$TARGET" ]; then
        echo '#!/bin/bash' > "$TARGET"
        echo 'set -eo pipefail' >> "$TARGET"
        echo '' >> "$TARGET"
        echo 'apt update' >> "$TARGET"
        chmod +x "$TARGET"
    fi
    cat >> "$TARGET"
}

defer_postinstall() {
    mkdir -p "$DEFER_SCRIPTS_DIR"
    TARGET="$DEFER_SCRIPTS_DIR/run-postinstall"
    if [ ! -f "$TARGET" ]; then
        echo '#!/bin/bash' > "$TARGET"
        echo 'set -eo pipefail' >> "$TARGET"
        echo '' >> "$TARGET"
        echo 'systemctl daemon-reload' >> "$TARGET"
        chmod +x "$TARGET"
    fi
    cat >> "$TARGET"
}

run_deferred_tasks() {
    if [ ! -d "$DEFER_SCRIPTS_DIR" ]; then
        echo "Warning: No deferred tasks to run. Is bebop-wizard properly configured?" >&2
        echo "Hint: Run dpkg-reconfigure bebop-wizard" >&2
        exit
    fi

    if [ -f "$DEFER_SCRIPTS_DIR/run-install" ]; then
        if ! "$DEFER_SCRIPTS_DIR/run-install"; then
            rm -rf "$DEFER_SCRIPTS_DIR"
            echo "Error: The installation step failed." >&2
            exit 1
        fi
        rm "$DEFER_SCRIPTS_DIR/run-install"
    fi

    if [ -f "$DEFER_SCRIPTS_DIR/run-postinstall" ]; then
        if ! "$DEFER_SCRIPTS_DIR/run-postinstall"; then
            rm -rf "$DEFER_SCRIPTS_DIR"
            echo "Error: The configuration step failed." >&2
            exit 1
        fi
        rm "$DEFER_SCRIPTS_DIR/run-postinstall"
    fi
}

ucf_() {
    # Detect if running from a maintainer script and add --debconf-ok if so
    if [[ "${DPKG_MAINTSCRIPT_PACKAGE:-}" ]]; then
        ucf --debconf-ok "$1" "$2"
    else
        ucf "$1" "$2"
    fi
}

check_required_commands() {
    local missing_commands=()
    local required_commands=("$@")

    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_commands+=("$cmd")
        fi
    done

    if [ ${#missing_commands[@]} -ne 0 ]; then
        echo "Error: The following required commands are missing:" >&2
        printf '  %s\n' "${missing_commands[@]}" >&2
        echo "Please install the missing commands and try again." >&2
        exit 1
    fi
}

nodejs_repo_configured() {
    NODE_MAJOR=22
    echo "Configuring Node.js $NODE_MAJOR APT repository..."
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | \
        gpg --batch --yes --output /usr/share/keyrings/nodesource.gpg --dearmor

    # Write repository configuration file
    LIST_TMPFILE="$NEWCONFIG_TMPDIR/apt/sources.list.d/nodesource.list"
    mkdir -p "$(dirname $LIST_TMPFILE)"
    echo "# This file is managed by bebop-wizard" > $LIST_TMPFILE
    echo "deb\
 [signed-by=/usr/share/keyrings/nodesource.gpg]\
 https://deb.nodesource.com/node_$NODE_MAJOR.x\
 nodistro\
 main" >> $LIST_TMPFILE

    # Configure Node.js package preferences
    PREFS_TMPFILE="$NEWCONFIG_TMPDIR/apt/preferences.d/nodejs"
    mkdir -p "$(dirname $PREFS_TMPFILE)"
    echo "Package: nodejs" > "$PREFS_TMPFILE"
    echo "Pin: origin deb.nodesource.com" >> "$PREFS_TMPFILE"
    echo "Pin-Priority: 600" >> "$PREFS_TMPFILE"

    # Update configuration files
    ucf_ "$LIST_TMPFILE" /etc/apt/sources.list.d/nodesource.list
    ucf_ "$PREFS_TMPFILE" /etc/apt/preferences.d/nodejs
}

mongodb_repo_configured() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        RELEASE="$VERSION_CODENAME"
        DISTRIBUTION="$ID"
    else
        echo "Error: /etc/os-release file not found" >&2
        exit 1
    fi

    case "$DISTRIBUTION" in
        ubuntu)
            ARCHIVE="multiverse"
            ;;
        debian)
            ARCHIVE="main"
            ;;
        *)
            echo "Error: Unsupported distribution ${DISTRIBUTION}" >&2
            exit 1
            ;;
    esac

    case "$DISTRIBUTION-$RELEASE" in
        ubuntu-noble|ubuntu-jammy|ubuntu-focal)
            ;;
        debian-bookworm)
            ;;
        *)
            echo "Error: Unsupported release ${RELEASE}" >&2
            exit 1
            ;;
    esac

    TMPFILE="$NEWCONFIG_TMPDIR/apt/sources.list.d/mongodb-org-8.0.list"
    mkdir -p "$(dirname $TMPFILE)"
    echo "Configuring MongoDB 8 APT repository..."
    curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
        gpg --batch --yes --output /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

    # Write repository configuration file
    echo "# This file is managed by bebop-wizard" > $TMPFILE
    echo "deb\
 [arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg]\
 https://repo.mongodb.org/apt/${DISTRIBUTION}\
 ${RELEASE}/mongodb-org/8.0\
 ${ARCHIVE}" >> $TMPFILE

    # Update configuration files
    ucf_ "$TMPFILE" /etc/apt/sources.list.d/mongodb-org-8.0.list
}

phoenixd_service() {
    PHOENIXD_VERSION="0.6.2"
    echo "Installing phoenixd ${PHOENIXD_VERSION}..."

    # Check if the version directory already exists
    STOW_DIR="/usr/local/phoenixd"
    PACKAGE_DIR="$STOW_DIR/phoenixd-${PHOENIXD_VERSION}"
    if ! [ -d "$PACKAGE_DIR" ]; then
        # Create temporary directory for download
        TEMP_DIR=$(mktemp -d)
        pushd "$TEMP_DIR" > /dev/null

        # Download and extract phoenixd
        PHOENIXD_URL="https://github.com/ACINQ/phoenixd/releases/download/v${PHOENIXD_VERSION}/phoenixd-${PHOENIXD_VERSION}-linux-x64.zip"
        echo "Downloading phoenixd ${PHOENIXD_VERSION} from ${PHOENIXD_URL}"
        curl -fSL# "$PHOENIXD_URL" -o phoenixd.zip -m 300
        unzip phoenixd.zip > /dev/null

        # Create stow directory structure
        mkdir -p "$PACKAGE_DIR/bin"

        # Install phoenixd binary to stow package directory
        cp phoenixd-*/* "$PACKAGE_DIR/bin/"
        chmod +x "$PACKAGE_DIR/bin/phoenixd"

        popd > /dev/null
        rm -rf "$TEMP_DIR"
    fi

    # Use stow to symlink the binary
    cd "$STOW_DIR"
    stow "phoenixd-${PHOENIXD_VERSION}"
    echo "Installed phoenixd ${PHOENIXD_VERSION} using stow."

    if [ "$(systemd-detect-virt --container)" = "none" ]; then
        ucf_ /usr/share/bebop-wizard/examples/systemd/phoenixd.service /etc/systemd/system/phoenixd-bebop.service
    else
        ucf_ /usr/share/bebop-wizard/examples/systemd/phoenixd-nons.service /etc/systemd/system/phoenixd-bebop.service
    fi

    defer_postinstall <<< "systemctl enable --now phoenixd-bebop.service"
}

minio_service() {
    DOMAIN="$1"
    MINIO_VERSION="RELEASE.2025-07-18T21-56-31Z"
    echo "Installing minio ${MINIO_VERSION}..."

    # Check if the version directory already exists
    STOW_DIR="/usr/local/minio"
    PACKAGE_DIR="$STOW_DIR/minio-${MINIO_VERSION}"
    if ! [ -d "$PACKAGE_DIR" ]; then
        # Create temporary directory for download
        TEMP_DIR=$(mktemp -d)
        pushd "$TEMP_DIR" > /dev/null

        # Download minio binary
        MINIO_URL="https://dl.min.io/server/minio/release/linux-amd64/archive/minio.${MINIO_VERSION}"
        echo "Downloading Minio ${MINIO_VERSION} from ${MINIO_URL}"
        curl -fSL# "$MINIO_URL" -o minio -m 300

        # Create stow directory structure
        mkdir -p "$PACKAGE_DIR/bin"

        # Install minio binary to stow package directory
        cp minio "$PACKAGE_DIR/bin/"
        chmod +x "$PACKAGE_DIR/bin/minio"

        popd > /dev/null
        rm -rf "$TEMP_DIR"
    fi

    # Use stow to symlink the binary
    cd "$STOW_DIR"
    stow "minio-${MINIO_VERSION}"
    echo "Installed minio ${MINIO_VERSION} using stow."

    TMPFILE="$NEWCONFIG_TMPDIR/minio/config.env"
    mkdir -p "$(dirname $TMPFILE)"
    cat /usr/share/bebop-wizard/examples/minio/config.env \
        | sed "s/example.com/${DOMAIN}/g" \
        | sed "s|placeholder_s3_key|$(openssl rand -base64 63 | tr -d '\n')|" \
        | sed "s|placeholder_s3_secret|$(openssl rand -base64 63 | tr -d '\n')|" \
        > $TMPFILE
    if [ "$DOMAIN" = "localhost" ]; then
        # Don't use https for localhost
        sed -i 's|MINIO_SERVER_URL=https://|MINIO_SERVER_URL=http://|' $TMPFILE
    fi
    mkdir -p "/etc/minio"
    ucf_ "$TMPFILE" /etc/minio/config.env

    if [ "$(systemd-detect-virt --container)" = "none" ]; then
        ucf_ /usr/share/bebop-wizard/examples/systemd/minio.service /etc/systemd/system/minio-bebop.service
    else
        ucf_ /usr/share/bebop-wizard/examples/systemd/minio-nons.service /etc/systemd/system/minio-bebop.service
    fi

    defer_postinstall <<< "systemctl enable --now minio-bebop.service"
}

nginx_service() {
    DOMAIN="$1"
    if [ -z "$DOMAIN" ]; then
        echo "Error: The domain name is required." >&2
        exit 1
    fi

    if ! getent hosts "$DOMAIN" &>/dev/null; then
        echo "Error: Domain '$DOMAIN' is not resolvable." >&2
        exit 1
    fi

    if ! getent hosts "s3.$DOMAIN" &>/dev/null; then
        echo "Error: Domain 's3.$DOMAIN' is not resolvable." >&2
        exit 1
    fi

    if dpkg -s nginx &>/dev/null; then
        echo "nginx is already installed."
    else
		defer_install <<-EOF
			echo "Installing nginx..."
			apt-get install -y nginx
			apt-mark auto nginx
			rm -f /etc/nginx/sites-enabled/default
		EOF
    fi

    if dpkg -s certbot &>/dev/null; then
        echo "certbot is already installed."
    else
		defer_install <<-EOF
			echo "Installing certbot..."
			apt-get install -y certbot
			apt-mark auto certbot
		EOF
    fi

    if dpkg -s python3-certbot-nginx &>/dev/null; then
        echo "python3-certbot-nginx is already installed."
    else
		defer_install <<-EOF
			echo "Installing python3-certbot-nginx..."
			apt-get install -y python3-certbot-nginx
			apt-mark auto python3-certbot-nginx
		EOF
    fi

    echo "Installing be-BOP site configuration..."

    TMPFILE="$NEWCONFIG_TMPDIR/nginx/be-BOP.conf"
    mkdir -p "$(dirname $TMPFILE)"
    if [ "$DOMAIN" = "localhost" ]; then
        cp /usr/share/bebop-wizard/examples/nginx/be-BOP-localhost.conf $TMPFILE
    else
        sed "s/example.com/${DOMAIN}/g" /usr/share/bebop-wizard/examples/nginx/be-BOP.conf > $TMPFILE
    fi

    mkdir -p /etc/nginx/sites-available
    mkdir -p /etc/nginx/sites-enabled
    ucf_ "$TMPFILE" /etc/nginx/sites-available/be-BOP.conf
    ln -sf /etc/nginx/sites-available/be-BOP.conf /etc/nginx/sites-enabled/

	defer_postinstall <<-EOF
		nginx -t
		systemctl enable --now nginx
		systemctl reload nginx
		echo "be-BOP nginx configuration deployed."
	EOF

    if [ "${DOMAIN}" != "localhost" ]; then
		defer_postinstall <<-EOF
			certbot --nginx -d "${DOMAIN}" -d "s3.${DOMAIN}"
		EOF
    fi
}

nodejs_installed() {
    if command -v node &>/dev/null || dpkg -s nodejs &>/dev/null; then
        echo "nodejs is already installed."
    else
		defer_install <<-EOF
			echo "Installing nodejs..."
			apt-get install -y nodejs
			apt-mark auto nodejs
		EOF
    fi
}

mongodb_enabled() {
    if systemctl is-active --quiet mongod; then
        echo "mongodb is already enabled."
    else
        if ! dpkg -s mongodb-org &>/dev/null; then
			defer_install <<-EOF
				echo "installing mongodb-org..."
				apt-get install -y mongodb-org
				apt-mark auto mongodb-org
			EOF
        fi

		defer_postinstall <<-EOF
			sed -i '/^#\?replication:/,/^[^ ]/c replication:\n  replSetName: "rs0"' /etc/mongod.conf
			systemctl enable --now mongod
			systemctl restart mongod
			until mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; do
				echo "Waiting for MongoDB..."
				sleep 2
			done
			mongosh --eval 'rs.initiate()' > /dev/null || true
			systemctl restart mongod
			until mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; do
				echo "Waiting for MongoDB..."
				sleep 2
			done
		EOF
    fi
}

managed_bebop_config() {
    DOMAIN="$1"
    nodejs_installed
    mongodb_enabled

    S3_ROOT_USER=$(grep '^MINIO_ROOT_USER=' /etc/minio/config.env 2>/dev/null | cut -d'=' -f2- || true)
    S3_ROOT_PASSWORD=$(grep '^MINIO_ROOT_PASSWORD=' /etc/minio/config.env 2>/dev/null | cut -d'=' -f2- || true)
    if [ -z "$S3_ROOT_USER" ] || [ -z "$S3_ROOT_PASSWORD" ]; then
        echo "Error: Could not find S3 credentials in /etc/minio/config.env" >&2
        exit 1
    fi

    TMPFILE="$NEWCONFIG_TMPDIR/be-BOP/config.env"
    mkdir -p "$(dirname $TMPFILE)"
    cat /usr/share/bebop-wizard/examples/managed-configuration.env \
        | sed "s/example.com/${DOMAIN}/g" \
        | sed "s|placeholder_s3_key|${S3_ROOT_USER}|" \
        | sed "s|placeholder_s3_secret|${S3_ROOT_PASSWORD}|" \
        > $TMPFILE
    if [ "$DOMAIN" = "localhost" ]; then
        # Don't use https for localhost
        sed -i 's|ORIGIN=https://|ORIGIN=http://|' $TMPFILE
        sed -i 's|PUBLIC_S3_ENDPOINT_URL=https://|PUBLIC_S3_ENDPOINT_URL=http://|' $TMPFILE
    fi
    mkdir -p "/etc/be-BOP"
    ucf_ "$TMPFILE" /etc/be-BOP/config.env

    if [ "$(systemd-detect-virt --container)" = "none" ]; then
        ucf_ /usr/share/bebop-wizard/examples/systemd/bebop.service /etc/systemd/system/bebop.service
    else
        ucf_ /usr/share/bebop-wizard/examples/systemd/bebop-nons.service /etc/systemd/system/bebop.service
    fi
    defer_postinstall <<< "systemctl enable --now bebop.service"
}

managed_deployment() {
    DOMAIN="$1"
    nodejs_installed
    mongodb_enabled

    S3_ROOT_USER=$(grep '^MINIO_ROOT_USER=' /etc/minio/config.env 2>/dev/null | cut -d'=' -f2- || true)
    S3_ROOT_PASSWORD=$(grep '^MINIO_ROOT_PASSWORD=' /etc/minio/config.env 2>/dev/null | cut -d'=' -f2- || true)
    if [ -z "$S3_ROOT_USER" ] || [ -z "$S3_ROOT_PASSWORD" ]; then
        echo "Error: Could not find S3 credentials in /etc/minio/config.env" >&2
        exit 1
    fi

    TMPFILE="$NEWCONFIG_TMPDIR/be-BOP/config.env"
    mkdir -p "$(dirname $TMPFILE)"
    cat /usr/share/bebop-wizard/examples/managed-deployment.env \
        | sed "s/example.com/${DOMAIN}/g" \
        | sed "s|placeholder_s3_key|${S3_ROOT_USER}|" \
        | sed "s|placeholder_s3_secret|${S3_ROOT_PASSWORD}|" \
        > $TMPFILE
    if [ "$DOMAIN" = "localhost" ]; then
        # Don't use https for localhost
        sed -i 's|ORIGIN=https://|ORIGIN=http://|' $TMPFILE
        sed -i 's|PUBLIC_S3_ENDPOINT_URL=https://|PUBLIC_S3_ENDPOINT_URL=http://|' $TMPFILE
    fi
    mkdir -p "/etc/be-BOP"
    ucf_ "$TMPFILE" /etc/be-BOP/config.env

    if [ "$(systemd-detect-virt --container)" = "none" ]; then
        ucf_ /usr/share/bebop-wizard/examples/systemd/bebop.service /etc/systemd/system/bebop.service
    else
        ucf_ /usr/share/bebop-wizard/examples/systemd/bebop-nons.service /etc/systemd/system/bebop.service
    fi
    defer_postinstall <<< "systemctl enable --now bebop.service"
}

update_bebop_distribution() {
    DEFER=false
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --defer)
                DEFER=true
                shift
                ;;
            *)
                echo "Error: bebop-wizard update called with unknown option: $1" >&2
                exit 1
                ;;
        esac
    done

    # Retrieve latest release
    LATEST_RELEASE_META=$(curl -s https://api.github.com/repos/be-BOP-io-SA/be-BOP/releases/latest | jq -r '.assets[] | select(.name | test("be-BOP\\.release\\.[0-9]{4}-[0-9]{2}-[0-9]{2}\\.[a-f0-9]+\\.zip"))')
    ARCHIVE_BASENAME=$(echo $LATEST_RELEASE_META | jq -r '.name' | sed 's|.zip$||')

    TARGET_DIR="/var/lib/be-BOP/releases/${ARCHIVE_BASENAME}"

    if [ -d "$TARGET_DIR" ]; then
        echo "The latest release be-BOP installation is up-to-date."
    else
        # Create temporary directory for download
        TEMP_DIR=$(mktemp -d)
        pushd "$TEMP_DIR" > /dev/null

        LATEST_RELEASE_URL=$(echo "$LATEST_RELEASE_META" | jq -r '.browser_download_url')
        if [ -z "$LATEST_RELEASE_URL" ]; then
            echo "Error: Could not fetch latest be-BOP release URL" >&2
            exit 1
        fi
        echo "Downloading ${ARCHIVE_BASENAME} from ${LATEST_RELEASE_URL}"
        curl -fSL# "$LATEST_RELEASE_URL" -o be-BOP-latest.zip -m 300
        unzip be-BOP-latest.zip > /dev/null
        EXTRACTED_DIR=$(find . -maxdepth 1 -type d -name "be-BOP release *" | head -1)
        if [ -z "$EXTRACTED_DIR" ]; then
            echo "Error: Could not find extracted directory for be-BOP release" >&2
            exit 1
        fi

        mkdir -p "$(dirname "$TARGET_DIR")"
        mv "$EXTRACTED_DIR" "$TARGET_DIR"

    	defer_postinstall <<-EOF
			echo "Installing be-BOP ${ARCHIVE_BASENAME} dependencies..."
			pushd "${TARGET_DIR}" > /dev/null
			corepack enable > /dev/null < /dev/null
			corepack install > /dev/null < /dev/null
			pnpm install --prod --frozen-lockfile
			popd > /dev/null
			echo "Latest be-BOP release installed successfully at ${TARGET_DIR}!"
		EOF

        popd > /dev/null
        rm -rf "$TEMP_DIR"
    fi
    ln -sf "$TARGET_DIR" /var/lib/be-BOP/releases/current
}

apply_configuration() {
    DEFER=false
    DOMAIN=""
    MANAGED_DEPLOYMENT=false
    INSTALL_PHOENIXD=false
    INSTALL_MINIO=false
    WITH_MONGODB_REPO=false
    WITH_NODEJS_REPO=false
    MANAGED_BEBOP=false
    MANAGED_MINIO=false
    MANAGED_NGINX=false
    MANAGED_PHOENIXD=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --defer)
                DEFER=true
                shift
                ;;
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --managed-deployment)
                MANAGED_DEPLOYMENT=true
                shift
                ;;
            --install-phoenixd)
                INSTALL_PHOENIXD=true
                shift
                ;;
            --install-minio)
                INSTALL_MINIO=true
                shift
                ;;
            --with-mongodb-repo)
                WITH_MONGODB_REPO=true
                shift
                ;;
            --with-nodejs-repo)
                WITH_NODEJS_REPO=true
                shift
                ;;
            --managed-bebop)
                MANAGED_BEBOP=true
                shift
                ;;
            --managed-minio)
                MANAGED_MINIO=true
                shift
                ;;
            --managed-nginx)
                MANAGED_NGINX=true
                shift
                ;;
            --managed-phoenixd)
                MANAGED_PHOENIXD=true
                shift
                ;;
            *)
                echo "Error: bebop-wizard configure called with unknown option: $1" >&2
                exit 1
                ;;
        esac
    done

    # Configure repositories if requested
    if [ "$WITH_NODEJS_REPO" = true ]; then
        nodejs_repo_configured
    fi
    if [ "$WITH_MONGODB_REPO" = true ]; then
        mongodb_repo_configured
    fi
    #if [ "$INSTALL_MINIO" = true ]; then
    #    minio_installed
    #fi
    #if [ "$INSTALL_PHOENIXD" = true ]; then
    #    phoenixd_installed
    #fi
    if [ "$MANAGED_PHOENIXD" = true ]; then
        phoenixd_service
    fi
    if [ "$MANAGED_MINIO" = true ]; then
        minio_service "$DOMAIN"
    fi
    # Configure managed services
    if [ "$MANAGED_NGINX" = true ] && [ -n "$DOMAIN" ]; then
        nginx_service "$DOMAIN"
    fi
    if [ "$MANAGED_DEPLOYMENT" = true ]; then
        managed_deployment "$DOMAIN"
    elif [ "$MANAGED_BEBOP" = true ]; then
        managed_bebop_config "$DOMAIN"
    fi
    if [ -d "$NEWCONFIG_TMPDIR" ]; then
        rm -fr "$NEWCONFIG_TMPDIR"
    fi
    if [ "$DEFER" = false ]; then
        run_deferred_tasks
    fi
    echo "be-BOP configuration completed successfully."
}

show_help() {
    cat << EOF
bebop-wizard - be-BOP Infrastructure Installation Wizard

USAGE:
    bebop-wizard [COMMAND]

COMMANDS:
    help, --help, -h        Show this help message
    configure               Internal command used to configure the bebop-wizard
                            package. Any other use is unsupported.
    finish_debian_install   Finish the installation process in debian.

EXAMPLES:
    bebop-wizard --help

For more information, visit: https://github.com/be-BOP/be-BOP
EOF
}

check_root() {
    if [ "$(id -u)" -ne 0 ]; then
        echo "Error: this program must be run as root" >&2
        exit 1
    fi
}

# Main command dispatcher
main() {
    case "${1:-}" in
        "configure")
            check_required_commands "wget" "stow" "gpg" "unzip"
            check_root
            shift
            apply_configuration "$@"
            ;;
        "finish_debian_install")
            run_deferred_tasks
            ;;
        "update")
            check_required_commands "curl" "jq" "unzip"
            check_root
            shift
            update_bebop_distribution "$@"
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            echo "Error: bebop-wizard called with unknown command '$1'" >&2
            echo "Run 'bebop-wizard help' for available commands." >&2
            exit 1
            ;;
    esac
}

# Call main function with all arguments
main "$@"
