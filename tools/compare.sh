#!/usr/bin/env bash
# Stack reference photo / game screenshot pairs side by side into one comparison sheet.
# usage: tools/compare.sh out.png ref1.jpg game1.png ref2.jpg game2.png ...
FF="${FFMPEG:-ffmpeg}"
out="$1"; shift
inputs=(); filters=""; n=0; rows=""
while [ $# -gt 1 ]; do
  inputs+=(-i "$1" -i "$2")
  filters+="[$((n*2)):v]scale=-2:420,crop=min(iw\,640):420,pad=640:420:(ow-iw)/2:0:black,setsar=1[r$n];"
  filters+="[$((n*2+1)):v]scale=-2:420,crop=min(iw\,640):420,pad=640:420:(ow-iw)/2:0:black,setsar=1[g$n];"
  filters+="[r$n][g$n]hstack=inputs=2[row$n];"
  rows+="[row$n]"; n=$((n+1)); shift 2
done
filters+="${rows}vstack=inputs=$n[out]"  # left: reference photo, right: game
"$FF" -y -loglevel error "${inputs[@]}" -filter_complex "$filters" -map "[out]" -frames:v 1 "$out"
