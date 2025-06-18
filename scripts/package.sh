#!/bin/bash

# Script to package the Grafana plugin properly for submission

set -e

# Clean up any existing archives
rm -f bsure1-chatbot-panel.zip
rm -f bsure1-chatbot-panel.zip.md5
rm -f bsure1-chatbot-panel.zip.sha1
rm -rf bsure1-chatbot-panel

# Build the plugin
echo "Building plugin..."
npm run build:all

# Create the proper directory structure
echo "Creating archive structure..."
mkdir -p bsure1-chatbot-panel
cp -r dist/* bsure1-chatbot-panel/

# Create the zip archive
echo "Creating zip archive..."
zip -r bsure1-chatbot-panel.zip bsure1-chatbot-panel

# Generate checksums
echo "Generating checksums..."
md5sum bsure1-chatbot-panel.zip > bsure1-chatbot-panel.zip.md5
sha1sum bsure1-chatbot-panel.zip > bsure1-chatbot-panel.zip.sha1

# Clean up temporary directory
rm -rf bsure1-chatbot-panel

echo "Package created successfully!"
echo "Files:"
echo "  - bsure1-chatbot-panel.zip"
echo "  - bsure1-chatbot-panel.zip.md5"
echo "  - bsure1-chatbot-panel.zip.sha1"
echo ""
echo "Checksums:"
echo "MD5:  $(cat bsure1-chatbot-panel.zip.md5 | cut -d' ' -f1)"
echo "SHA1: $(cat bsure1-chatbot-panel.zip.sha1 | cut -d' ' -f1)"