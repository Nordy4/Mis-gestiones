# Genera los iconos PNG de la PWA en public/icons (Windows, System.Drawing).
# Uso: npm run icons
# Logo "Órbita" (mismo dibujo que public/favicon.svg, en una rejilla de 120 x 120):
# arco de círculo (centro 60,60, radio 28, de 0° a 300°) y un punto en (84,44).
Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force $out | Out-Null

function New-Icon([int]$size, [string]$path, [double]$contentScale, [bool]$rounded) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::Transparent)

  $bg = [System.Drawing.ColorTranslator]::FromHtml('#09090b')
  $accent = [System.Drawing.ColorTranslator]::FromHtml('#9d7bf5')

  # Fondo
  $bgBrush = New-Object System.Drawing.SolidBrush $bg
  if ($rounded) {
    $r = [int]($size * 0.466) # mismo redondeo que el SVG (rx 28 de 120)
    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gp.AddArc(0, 0, $r, $r, 180, 90)
    $gp.AddArc($size - $r, 0, $r, $r, 270, 90)
    $gp.AddArc($size - $r, $size - $r, $r, $r, 0, 90)
    $gp.AddArc(0, $size - $r, $r, $r, 90, 90)
    $gp.CloseFigure()
    $g.FillPath($bgBrush, $gp)
  } else {
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)
  }

  # Dibujo en unidades de la rejilla de 120, escalado y centrado.
  # contentScale 0.72 = tamaño del SVG; menos = más margen (iconos maskable).
  $k = ($size / 120.0) * ($contentScale / 0.72)
  $g.TranslateTransform($size / 2.0, $size / 2.0)
  $g.ScaleTransform($k, $k)
  $g.TranslateTransform(-60, -60)

  $pen = New-Object System.Drawing.Pen $accent, 9
  $pen.StartCap = 'Round'
  $pen.EndCap = 'Round'
  $g.DrawArc($pen, 32, 32, 56, 56, 0, 300)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $accent), 77, 37, 14, 14)

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

New-Icon 192 (Join-Path $out 'pwa-192.png') 0.72 $true
New-Icon 512 (Join-Path $out 'pwa-512.png') 0.72 $true
New-Icon 512 (Join-Path $out 'maskable-512.png') 0.56 $false
New-Icon 180 (Join-Path $out 'apple-touch-icon.png') 0.68 $false
Write-Output "Iconos generados en $out"
