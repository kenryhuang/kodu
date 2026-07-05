param(
  [string]$AtlasPath = "public/assets/textures/concept-material-atlas.png",
  [string]$OutputDir = "public/assets/textures/concept"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Add-Type -AssemblyName System.Drawing

$tiles = @(
  @{ Name = "grass.png"; Column = 0; Row = 0 },
  @{ Name = "dirt-road.png"; Column = 1; Row = 0 },
  @{ Name = "plaster-warm.png"; Column = 2; Row = 0 },
  @{ Name = "weathered-wood.png"; Column = 3; Row = 0 },
  @{ Name = "roof-red.png"; Column = 0; Row = 1 },
  @{ Name = "stone-masonry.png"; Column = 1; Row = 1 },
  @{ Name = "bark.png"; Column = 2; Row = 1 },
  @{ Name = "foliage.png"; Column = 3; Row = 1 },
  @{ Name = "window-glass.png"; Column = 0; Row = 2 },
  @{ Name = "moss.png"; Column = 1; Row = 2 },
  @{ Name = "plaster-clay.png"; Column = 2; Row = 2 },
  @{ Name = "roof-teal.png"; Column = 3; Row = 2 },
  @{ Name = "pebbles.png"; Column = 0; Row = 3 },
  @{ Name = "trim-wood.png"; Column = 1; Row = 3 },
  @{ Name = "wildflower-meadow.png"; Column = 2; Row = 3 },
  @{ Name = "dark-dirt.png"; Column = 3; Row = 3 }
)

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$atlas = [System.Drawing.Bitmap]::FromFile((Resolve-Path $AtlasPath))
try {
  $cellWidth = $atlas.Width / 4.0
  $cellHeight = $atlas.Height / 4.0

  foreach ($tile in $tiles) {
    $left = [Math]::Round([double]$tile.Column * $cellWidth)
    $top = [Math]::Round([double]$tile.Row * $cellHeight)
    $right = [Math]::Round(([double]$tile.Column + 1) * $cellWidth)
    $bottom = [Math]::Round(([double]$tile.Row + 1) * $cellHeight)
    $sourceRect = New-Object System.Drawing.Rectangle $left, $top, ($right - $left), ($bottom - $top)

    $outImage = New-Object System.Drawing.Bitmap 512, 512, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($outImage)
      try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($atlas, (New-Object System.Drawing.Rectangle 0, 0, 512, 512), $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
      } finally {
        $graphics.Dispose()
      }

      $outputPath = Join-Path $OutputDir $tile.Name
      $outImage.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $outImage.Dispose()
    }
  }
} finally {
  $atlas.Dispose()
}
