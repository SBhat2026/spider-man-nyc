#!/bin/sh
# Bump the ?v= cache-buster on every asset in index.html.
# The version is what makes a deploy actually reach players (GitHub Pages serves
# these with long cache lifetimes), and during development it's the only
# reliable way to force a browser to pick up an edited src file — a plain
# hard-reload will still hand back a memory-cached main.js?v=<same>.
set -e
cd "$(dirname "$0")/.."
cur=$(grep -o '?v=[0-9]\+' index.html | head -1 | cut -d= -f2)
next=$((cur + 1))
sed -i '' "s/?v=$cur/?v=$next/g" index.html
echo "assets v$cur -> v$next"
