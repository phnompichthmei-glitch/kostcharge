#!/bin/bash
# Auto-install Khmer fonts for PDF generation
# This script runs on container startup

echo "Checking Khmer fonts installation..."

FONT_PATH="/usr/share/fonts/truetype/khmeros/KhmerOSsiemreap.ttf"

if [ ! -f "$FONT_PATH" ]; then
    echo "Khmer fonts not found. Installing..."
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y fonts-khmeros
    echo "✓ Khmer fonts installed successfully"
else
    echo "✓ Khmer fonts already installed"
fi

# Verify installation
if [ -f "$FONT_PATH" ]; then
    echo "✓ Font verification passed: $(ls -lh $FONT_PATH)"
    exit 0
else
    echo "✗ Font installation failed"
    exit 1
fi
