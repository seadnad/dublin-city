#!/bin/sh
# Encode the trailer frames from tools/scenarios/video.mjs into an MP4 (H.264, plays everywhere, starts streaming fast).
set -e
cd "$(dirname "$0")/video"
ffmpeg -loglevel error -y -framerate 30 -i frames/f%05d.jpg -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -movflags +faststart dublin-trailer.mp4
ls -la dublin-trailer.mp4
