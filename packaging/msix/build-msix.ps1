#Requires -Version 7.0
param(
  [string]$Version = "",
  [string]$ReleaseDir = "src-tauri/target/release",
  [string]$OutputDir = "dist-msix",
  [string]$IdentityName = "s-kob.schedule-viewer",
  [string]$Publisher = "CN=B5A5C4B1-E7D0-4FBD-AD01-ED0095094409",
  [string]$PublisherDisplayName = "s-kob",
  [string]$DisplayName = "schedule-viewer"
)

$ErrorActionPreference = "Stop"

function Assert-TransparentCorners([System.Drawing.Bitmap]$Bitmap, [string]$Label) {
  # 入れ子の @() 内の - は配列の引き算と解釈されるため、座標は先に変数へ入れる。
  $maxX = $Bitmap.Width - 1
  $maxY = $Bitmap.Height - 1
  $points = @(
    @(0, 0),
    @($maxX, 0),
    @(0, $maxY),
    @($maxX, $maxY)
  )
  foreach ($point in $points) {
    $color = $Bitmap.GetPixel($point[0], $point[1])
    if ($color.A -ne 0) {
      throw "$Label の四隅が透明ではありません (alpha=$($color.A))"
    }
  }
}

function Add-TaskbarLogos([string]$SourcePng, [string]$ImagesDir) {
  if (-not (Test-Path $SourcePng)) {
    throw "タスクバー用の原画が見つかりません: $SourcePng"
  }
  Add-Type -AssemblyName System.Drawing
  $sizes = @(16, 20, 24, 30, 32, 36, 40, 48, 60, 64, 72, 80, 96, 256)
  $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path $SourcePng))
  try {
    Assert-TransparentCorners $source $SourcePng
    foreach ($size in $sizes) {
      $bitmap = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
          $graphics.Clear([System.Drawing.Color]::Transparent)
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
          $attributes = New-Object System.Drawing.Imaging.ImageAttributes
          try {
            $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
            $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
            $graphics.DrawImage(
              $source,
              $rect,
              0, 0, $source.Width, $source.Height,
              [System.Drawing.GraphicsUnit]::Pixel,
              $attributes)
          } finally {
            $attributes.Dispose()
          }
        } finally {
          $graphics.Dispose()
        }
        # 原画の角丸は端から 128/1024 だけ内側にある。縮小の補間がこの余白へ色をにじませても、角は透明のままにする。
        $inset = [Math]::Floor($size * 128 / 1024)
        $clear = [Math]::Max(0, $inset - 1)
        if ($clear -gt 0) {
          $transparent = [System.Drawing.Color]::Transparent
          for ($y = 0; $y -lt $size; $y++) {
            for ($x = 0; $x -lt $size; $x++) {
              $onMargin = ($x -lt $clear) -or ($y -lt $clear) -or ($x -ge ($size - $clear)) -or ($y -ge ($size - $clear))
              if ($onMargin) {
                $bitmap.SetPixel($x, $y, $transparent)
              }
            }
          }
        }
        $plain = Join-Path $ImagesDir "Square44x44Logo.targetsize-$size.png"
        Assert-TransparentCorners $bitmap $plain
        $bitmap.Save($plain, [System.Drawing.Imaging.ImageFormat]::Png)
      } finally {
        $bitmap.Dispose()
      }
      Copy-Item $plain (Join-Path $ImagesDir "Square44x44Logo.targetsize-${size}_altform-unplated.png")
      Copy-Item $plain (Join-Path $ImagesDir "Square44x44Logo.targetsize-${size}_altform-lightunplated.png")
    }
  } finally {
    $source.Dispose()
  }
}

function Get-WindowsSdkTool([string]$Name) {
  $pattern = '\\x64\\' + [regex]::Escape($Name) + '$'
  $tool = Get-ChildItem -Path "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Recurse -Filter $Name -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match $pattern } |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if (-not $tool) {
    throw "$Name が見つかりません。Windows SDK をインストールしてください。"
  }
  return $tool.FullName
}

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

if (-not $Version) {
  $pkg = Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json
  $Version = $pkg.version
}

if ($Version -match "beta") {
  throw "Store 用 MSIX は安定版 (X.Y.Z) だけをパッケージします。現在の版: $Version"
}

$msixVersion = "$Version.0"
$exeName = "schedule-viewer.exe"
$exePath = Join-Path $root $ReleaseDir $exeName
if (-not (Test-Path $exePath)) {
  throw "リリースビルドが見つかりません: $exePath"
}

$staging = Join-Path $env:TEMP "schedule-viewer-msix-staging"
if (Test-Path $staging) {
  Remove-Item -Recurse -Force $staging
}
New-Item -ItemType Directory -Path $staging | Out-Null
$imagesDir = Join-Path $staging "images"
New-Item -ItemType Directory -Path $imagesDir | Out-Null

$iconDir = Join-Path $root "src-tauri/icons"
Copy-Item (Join-Path $iconDir "StoreLogo.png") (Join-Path $imagesDir "StoreLogo.png")
Copy-Item (Join-Path $iconDir "Square44x44Logo.png") (Join-Path $imagesDir "Square44x44Logo.png")
Copy-Item (Join-Path $iconDir "Square150x150Logo.png") (Join-Path $imagesDir "Square150x150Logo.png")
Add-TaskbarLogos -SourcePng (Join-Path $iconDir "icon.png") -ImagesDir $imagesDir
Copy-Item $exePath (Join-Path $staging $exeName)
$releaseFull = Join-Path $root $ReleaseDir
Get-ChildItem -Path $releaseFull -Filter "*.dll" | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $staging $_.Name)
}

$bundledDirs = @("json-skills", "read-screen")
foreach ($dirName in $bundledDirs) {
  $sourceDir = Join-Path $releaseFull $dirName
  if (-not (Test-Path $sourceDir)) {
    throw "同梱スキル用のフォルダが見つかりません: $sourceDir"
  }
  $destDir = Join-Path $staging $dirName
  Copy-Item -Path $sourceDir -Destination $destDir -Recurse
}

$requiredSkillFiles = @(
  "json-skills\write-schedule\SKILL.md",
  "json-skills\write-members\SKILL.md",
  "json-skills\write-calendar\SKILL.md",
  "json-skills\write-workspace\SKILL.md",
  "json-skills\write-fields\SKILL.md",
  "json-skills\write-colors\SKILL.md",
  "read-screen\SKILL.md"
)
foreach ($relativePath in $requiredSkillFiles) {
  $fullPath = Join-Path $staging $relativePath
  if (-not (Test-Path $fullPath)) {
    throw "同梱スキルが見つかりません: $relativePath"
  }
}

$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<Package
  xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
  xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
  xmlns:uap3="http://schemas.microsoft.com/appx/manifest/uap/windows10/3"
  xmlns:uap5="http://schemas.microsoft.com/appx/manifest/uap/windows10/5"
  xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
  IgnorableNamespaces="uap uap3 uap5 rescap">
  <Identity
    Name="$IdentityName"
    Publisher="$Publisher"
    Version="$msixVersion"
    ProcessorArchitecture="x64" />
  <Properties>
    <DisplayName>$DisplayName</DisplayName>
    <PublisherDisplayName>$PublisherDisplayName</PublisherDisplayName>
    <Logo>images\StoreLogo.png</Logo>
  </Properties>
  <Resources>
    <Resource Language="ja-jp" />
    <Resource Language="en-us" />
  </Resources>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.22621.0" />
  </Dependencies>
  <Capabilities>
    <rescap:Capability Name="runFullTrust" />
  </Capabilities>
  <Applications>
    <Application Id="App" Executable="$exeName" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements
        DisplayName="$DisplayName"
        Description="schedule-viewer"
        BackgroundColor="transparent"
        Square150x150Logo="images\Square150x150Logo.png"
        Square44x44Logo="images\Square44x44Logo.png" />
      <Extensions>
        <uap5:Extension Category="windows.appExecutionAlias">
          <uap5:AppExecutionAlias>
            <uap5:ExecutionAlias Alias="$exeName" />
          </uap5:AppExecutionAlias>
        </uap5:Extension>
      </Extensions>
    </Application>
  </Applications>
</Package>
"@
$manifestPath = Join-Path $staging "AppxManifest.xml"
Set-Content -Path $manifestPath -Value $manifest -Encoding utf8NoBOM

$makeappx = Get-WindowsSdkTool "makeappx.exe"
$makepri = Join-Path (Split-Path $makeappx) "makepri.exe"
if (-not (Test-Path $makepri)) {
  throw "makepri.exe が見つかりません。Windows SDK をインストールしてください。"
}

$priRoot = Join-Path $env:TEMP "schedule-viewer-msix-pri"
if (Test-Path $priRoot) {
  Remove-Item -Recurse -Force $priRoot
}
New-Item -ItemType Directory -Path (Join-Path $priRoot "images") | Out-Null
Copy-Item $manifestPath $priRoot
Copy-Item (Join-Path $imagesDir "*") (Join-Path $priRoot "images")
$priConfig = Join-Path $env:TEMP "schedule-viewer-priconfig.xml"
& $makepri createconfig /cf $priConfig /dq lang-ja-jp /o | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "makepri createconfig が失敗しました (exit $LASTEXITCODE)"
}
$priFile = Join-Path $staging "resources.pri"
& $makepri new /pr $priRoot /cf $priConfig /mn (Join-Path $priRoot "AppxManifest.xml") /of $priFile /o | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "makepri new が失敗しました (exit $LASTEXITCODE)"
}
$priDump = Join-Path $env:TEMP "schedule-viewer-pri-dump.xml"
& $makepri dump /if $priFile /of $priDump /o | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "makepri dump が失敗しました (exit $LASTEXITCODE)"
}
$priText = Get-Content $priDump -Raw
if ($priText -notmatch "targetsize-24") {
  throw "resources.pri に targetsize-24 がありません"
}
if ($priText -notmatch "lightunplated") {
  throw "resources.pri に altform-lightunplated がありません"
}
# lightunplated の一部として unplated が含まれるので、明るいテーマ用とは別に暗いテーマ用を見る。
if ($priText -notmatch "(?<!light)unplated") {
  throw "resources.pri に altform-unplated がありません"
}

$outRoot = Join-Path $root $OutputDir
New-Item -ItemType Directory -Force -Path $outRoot | Out-Null
$msixFile = Join-Path $outRoot "schedule-viewer_${msixVersion}_x64.msix"
if (Test-Path $msixFile) {
  Remove-Item -Force $msixFile
}

& $makeappx pack /d $staging /p $msixFile /nv | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "MakeAppx が失敗しました (exit $LASTEXITCODE)"
}

Write-Host "MSIX: $msixFile"
