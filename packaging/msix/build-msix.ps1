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
Copy-Item $exePath (Join-Path $staging $exeName)
$releaseFull = Join-Path $root $ReleaseDir
Get-ChildItem -Path $releaseFull -Filter "*.dll" | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $staging $_.Name)
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
    <PackageDependency
      Name="Microsoft.WebView2Runtime"
      Publisher="CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US"
      MinVersion="120.0.2210.91" />
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
Set-Content -Path (Join-Path $staging "AppxManifest.xml") -Value $manifest -Encoding utf8NoBOM

$makeappx = Get-ChildItem -Path "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Recurse -Filter "makeappx.exe" -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match "\\x64\\makeappx\.exe$" } |
  Sort-Object FullName -Descending |
  Select-Object -First 1
if (-not $makeappx) {
  throw "makeappx.exe が見つかりません。Windows SDK をインストールしてください。"
}

$outRoot = Join-Path $root $OutputDir
New-Item -ItemType Directory -Force -Path $outRoot | Out-Null
$msixFile = Join-Path $outRoot "schedule-viewer_${msixVersion}_x64.msix"
if (Test-Path $msixFile) {
  Remove-Item -Force $msixFile
}

& $makeappx.FullName pack /d $staging /p $msixFile /nv | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "MakeAppx が失敗しました (exit $LASTEXITCODE)"
}

Write-Host "MSIX: $msixFile"
