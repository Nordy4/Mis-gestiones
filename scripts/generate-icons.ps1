# Genera los iconos PNG de la PWA en public/icons (Windows, System.Drawing).
# Uso: npm run icons
Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force $out | Out-Null

function New-Icon([int]$size, [string]$path, [double]$contentScale, [bool]$rounded) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)

  $bg = [System.Drawing.ColorTranslator]::FromHtml('#09090b')
  $accent = [System.Drawing.ColorTranslator]::FromHtml('#10b981')

  # Fondo
  $bgBrush = New-Object System.Drawing.SolidBrush $bg
  if ($rounded) {
    $r = [int]($size * 0.22)
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

  # Círculo de acento
  $d = [int]($size * $contentScale)
  $o = [int](($size - $d) / 2)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $accent), $o, $o, $d, $d)

  # Texto "MV"
  $font = New-Object System.Drawing.Font 'Segoe UI', ([float]($d * 0.36)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = 'Center'
  $fmt.LineAlignment = 'Center'
  $rect = New-Object System.Drawing.RectangleF 0, ([float]($size * 0.01)), $size, $size
  $g.DrawString('MV', $font, [System.Drawing.Brushes]::White, $rect, $fmt)

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

New-Icon 192 (Join-Path $out 'pwa-192.png') 0.72 $true
New-Icon 512 (Join-Path $out 'pwa-512.png') 0.72 $true
New-Icon 512 (Join-Path $out 'maskable-512.png') 0.56 $false
New-Icon 180 (Join-Path $out 'apple-touch-icon.png') 0.68 $false
Write-Output "Iconos generados en $out"
