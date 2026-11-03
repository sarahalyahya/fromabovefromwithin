#!/usr/bin/env bash
# Re-encode the film's media at the size it is shown, so a full viewing
# downloads tens of megabytes instead of about 125 MB. Needs ffmpeg.
#
#   bash tools/encode.sh
#
# Writes to assets/encoded/ and leaves the originals alone. Watch the film with
# the encoded files first (copy them over the originals), then commit.
set -euo pipefail
cd "$(dirname "$0")/.."

out=assets/encoded
mkdir -p "$out/video" "$out/audio"

# muted clips: no audio track, scaled to roughly twice their on-screen width
mute() { ffmpeg -y -loglevel error -i "assets/video/$1" -vf "scale=$2:-2" -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p -an -movflags +faststart "$out/video/$1"; }
# clips that play sound
sound() { ffmpeg -y -loglevel error -i "assets/video/$1" -vf "scale=$2:-2" -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart "$out/video/$1"; }

mute  hyrax_1.mp4      640
sound hyrax_2.mp4      480
sound hyrax_3.mp4      480
mute  hyrax_4.mp4      360
mute  hyrax_5_rot.mp4  480
mute  hyrax_7.mp4      640
mute  view.mp4         540
mute  i_dronefootage.mp4        640
mute  i_dronecrosshair_p1.mp4   640
mute  i_donecrosshair_uncut.mp4 640
mute  digging.mp4      640

# narration: mono AAC is plenty for a voice. The file names change from .mp3 to
# .m4a, so update the <audio src> lines in index.html if you switch to these.
for f in assets/audio/VO__*.mp3; do
  n=$(basename "$f" .mp3)
  ffmpeg -y -loglevel error -i "$f" -ac 1 -c:a aac -b:a 64k "$out/audio/$n.m4a"
done

du -sh assets/video assets/audio "$out/video" "$out/audio"
