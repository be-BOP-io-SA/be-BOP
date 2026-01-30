#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Building release artifact..."

# Check if we're in the right directory (should have package.json)
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed. Please install pnpm first."
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is not installed. Please install jq first."
    exit 1
fi

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo "❌ Error: curl is not installed. Please install curl first."
    exit 1
fi

GEOIP_RELEASE_API="https://api.github.com/repos/Skiddle-ID/geoip2-mirror/releases/latest"
GEOIP_ASSETS_DIR="assets"
GEOIP_FILES=("IP2LOCATION-LITE-DB1.CSV" "IP2LOCATION-LITE-DB1.IPV6.CSV")
ONE_WEEK_SECONDS=$((7 * 24 * 60 * 60))

download_geoip_assets() {
    local release_json
    if ! release_json=$(curl -fsSL -H "Accept: application/vnd.github+json" -H "User-Agent: be-bop" "$GEOIP_RELEASE_API"); then
        local missing_asset=false
        for geoip_file in "${GEOIP_FILES[@]}"; do
            if [ ! -f "$GEOIP_ASSETS_DIR/$geoip_file" ]; then
                missing_asset=true
                break
            fi
        done
        if [ "$missing_asset" = true ]; then
            echo "❌ Error: unable to query GeoIP release metadata and missing local assets."
            exit 1
        fi
        echo "⚠️  Warning: unable to query GeoIP release metadata. Keeping existing assets."
        return
    fi

    mkdir -p "$GEOIP_ASSETS_DIR"

    local now
    now=$(date +%s)

    for geoip_file in "${GEOIP_FILES[@]}"; do
        local target_file="$GEOIP_ASSETS_DIR/$geoip_file"
        local asset_url asset_updated asset_size
        asset_url=$(jq -r --arg name "$geoip_file" '.assets[] | select(.name == $name) | .browser_download_url' <<< "$release_json")
        asset_updated=$(jq -r --arg name "$geoip_file" '.assets[] | select(.name == $name) | .updated_at' <<< "$release_json")
        asset_size=$(jq -r --arg name "$geoip_file" '.assets[] | select(.name == $name) | .size' <<< "$release_json")

        if [ -z "$asset_url" ] || [ "$asset_url" = "null" ]; then
            if [ -f "$target_file" ]; then
                echo "⚠️  Warning: asset $geoip_file not found in release metadata. Keeping existing file."
                continue
            fi
            echo "❌ Error: asset $geoip_file not found in GeoIP release metadata."
            exit 1
        fi

        if [ -f "$target_file" ]; then
            local local_mtime local_size age_seconds
            local_mtime=$(stat -c %Y "$target_file")
            local_size=$(stat -c %s "$target_file")
            age_seconds=$((now - local_mtime))

            if [ "$age_seconds" -lt "$ONE_WEEK_SECONDS" ]; then
                echo "✅ GeoIP asset $geoip_file is recent; skipping update."
                continue
            fi

            if [ -n "$asset_updated" ] && [ "$asset_updated" != "null" ]; then
                local asset_updated_epoch
                asset_updated_epoch=$(date -d "$asset_updated" +%s)
                if [ "$asset_updated_epoch" -le "$local_mtime" ] && [ "$local_size" -eq "$asset_size" ]; then
                    echo "✅ GeoIP asset $geoip_file matches latest release metadata."
                    continue
                fi
            fi

            echo "⬇️ Updating GeoIP asset $geoip_file..."
            local tmp_file
            tmp_file=$(mktemp "${target_file}.tmp.XXXXXX")
            if curl -fsSL -o "$tmp_file" "$asset_url"; then
                if [ -n "$asset_size" ] && [ "$asset_size" != "null" ]; then
                    local tmp_size
                    tmp_size=$(stat -c %s "$tmp_file")
                    if [ "$tmp_size" -ne "$asset_size" ]; then
                        echo "⚠️  Downloaded $geoip_file size mismatch; keeping existing file."
                        rm -f "$tmp_file"
                        continue
                    fi
                fi
                mv "$tmp_file" "$target_file"
            else
                echo "⚠️  Failed to update $geoip_file; keeping existing file."
                rm -f "$tmp_file"
            fi
        else
            echo "⬇️ Downloading GeoIP asset $geoip_file..."
            local tmp_file
            tmp_file=$(mktemp "${target_file}.tmp.XXXXXX")
            if curl -fsSL -o "$tmp_file" "$asset_url"; then
                if [ -n "$asset_size" ] && [ "$asset_size" != "null" ]; then
                    local tmp_size
                    tmp_size=$(stat -c %s "$tmp_file")
                    if [ "$tmp_size" -ne "$asset_size" ]; then
                        echo "❌ Error: downloaded $geoip_file size mismatch."
                        rm -f "$tmp_file"
                        exit 1
                    fi
                fi
                mv "$tmp_file" "$target_file"
            else
                echo "❌ Error: failed to download required GeoIP asset $geoip_file."
                rm -f "$tmp_file"
                exit 1
            fi
        fi
    done
}

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🌍 Ensuring GeoIP assets are available..."
download_geoip_assets

echo "🔨 Building project..."
pnpm build

HASH=$(git rev-parse --short HEAD)
COMMIT_DATE="$(git log -1 --date=format:%F --pretty=format:%cd)"
ARTIFACT_NAME="bebop-$COMMIT_DATE-$HASH"
OUTPUT_DIR="release"
echo "📁 Creating artifact directory: $OUTPUT_DIR/$ARTIFACT_NAME"
if [ -d "$OUTPUT_DIR/$ARTIFACT_NAME" ]; then
    echo "⚠️  Removing existing $OUTPUT_DIR/$ARTIFACT_NAME directory..."
    rm -rf "$OUTPUT_DIR/$ARTIFACT_NAME"
fi
mkdir -p "$OUTPUT_DIR/$ARTIFACT_NAME"
mv ./build "$OUTPUT_DIR/$ARTIFACT_NAME"
cp -r ./patches "$OUTPUT_DIR/$ARTIFACT_NAME"
cp package.json "$OUTPUT_DIR/$ARTIFACT_NAME/package.json"
cp pnpm-lock.yaml "$OUTPUT_DIR/$ARTIFACT_NAME/pnpm-lock.yaml"
cp -r ./assets "$OUTPUT_DIR/$ARTIFACT_NAME/assets"
cp -r ./docs "$OUTPUT_DIR/$ARTIFACT_NAME/docs"

echo "✅ Release artifact created successfully!"
echo "📁 Directory: $OUTPUT_DIR/$ARTIFACT_NAME"
echo ""
echo "To run a production server using the artifact:"
echo "  cd $OUTPUT_DIR/$ARTIFACT_NAME"
echo "  pnpm install --prod --frozen-lockfile"
echo "  pnpm run-production  (make sure the environment variables are set)"
