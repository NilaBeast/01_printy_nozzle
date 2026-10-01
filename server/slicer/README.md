# Free Bambu CLI integration — exact Bambu Studio slicing for quotes
# ============================================================
# The storefront quote uses the SAME engine + profiles as Bambu Studio,
# so filament weight, print time, supports and price match Bambu Studio.
#
# 1) Install the FREE slicer (one of):
#    - Bambu Studio (preferred, exact numbers): https://bambulab.com/download
#    - PrusaSlicer / OrcaSlicer (same engine family, fallback):
#      https://www.prusa3d.com/prusaslicer / https://orcaslicer.com
#
# 2) Make the CLI reachable (pick one):
#    - Put it on PATH:  bambu-studio / prusa-slicer / orcaslicer
#    - Or set an explicit binary path in server/.env:
#        BAMBU_STUDIO_BIN="C:\Program Files\Bambu Studio\bambu-studio.exe"
#        # generic override also works:
#        SLICER_BIN=/usr/bin/prusa-slicer
#
# 3) Printer + profile used for every quote (shown in the storefront):
#        BAMBU_PRINTER="Bambu Lab P1S · 0.4 nozzle · 256×256×256mm"
#    Bundled profiles live in server/slicer/profiles/ and mirror
#    Bambu Studio 0.20mm Standard @BBL P1S
#    (2 wall loops, grid infill, tree-auto supports @ 30°).
#
# 4) For a 1:1 match with YOUR Bambu Studio installation, export your own
#    presets (Bambu Studio > File > Export > Export presets) and replace:
#      server/slicer/profiles/bambu/machine.p1s.json
#      server/slicer/profiles/bambu/process.0.20-standard.json
#      server/slicer/profiles/bambu/filament.generic.json
#
# Without any CLI installed the API keeps working:
#   GET /api/printing/slicer-status  -> { available: false, ... }
#   POST /api/printing/slice-quote   -> 503 + fallback estimator note
# and the storefront shows "Estimate" instead of "Bambu Studio exact".
#
# Endpoints:
#   GET  /api/printing/slicer-status
#   POST /api/printing/slice-quote   (multipart: file + material_id/slug,
#        infill_density, supports, layer_height?, quantity?)
