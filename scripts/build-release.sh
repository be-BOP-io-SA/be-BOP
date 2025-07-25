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

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🔨 Building project..."
pnpm build

HASH=$(git rev-parse --short HEAD)
COMMIT_DATE="$(git log -1 --date=format:%F --pretty=format:%cd)"
ARTIFACT_NAME="bebop-$COMMIT_DATE-$HASH"
ZIPFILE_NAME="bebop-$COMMIT_DATE-$HASH.zip"
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
cp -r ./docs "$OUTPUT_DIR/$ARTIFACT_NAME/assets"

# Create zip file
echo "📦 Creating zip file: $OUTPUT_DIR/$ZIPFILE_NAME"
if [ -f "$OUTPUT_DIR/$ZIPFILE_NAME" ]; then
    echo "⚠️  Removing existing $OUTPUT_DIR/$ZIPFILE_NAME..."
    rm "$OUTPUT_DIR/$ZIPFILE_NAME"
fi
(cd "$OUTPUT_DIR" && zip -r "$ZIPFILE_NAME" "$ARTIFACT_NAME")

echo "✅ Release artifact created successfully!"
echo "📁 Directory: $OUTPUT_DIR/$ARTIFACT_NAME"
echo "📦 Zip file: $OUTPUT_DIR/$ZIPFILE_NAME"
echo ""
echo "To run a production server using the artifact:"
echo "  cd $OUTPUT_DIR/$ARTIFACT_NAME"
echo "  pnpm install --prod --frozen-lockfile"
echo "  pnpm run-production  (make sure the environment variables are set)"
