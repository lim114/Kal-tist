param([string]$RuntimeDirectory,[string]$InnoCompiler)
$ErrorActionPreference='Stop'
$buildRoot=$PSScriptRoot
& (Join-Path $buildRoot 'prepare.ps1') -RuntimeDirectory $RuntimeDirectory
if(-not $InnoCompiler){$InnoCompiler=Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'}
if(-not (Test-Path -LiteralPath $InnoCompiler)){throw 'Please install Inno Setup 6 or specify -InnoCompiler'}
$argsList=@('/nologo','/noconfig','/target:winexe','/platform:x64','/optimize+','/reference:System.dll','/reference:System.Core.dll','/reference:System.Windows.Forms.dll','/reference:System.Web.Extensions.dll',('/win32manifest:'+(Join-Path $buildRoot 'src/launcher.manifest')),('/win32icon:'+(Join-Path $buildRoot 'payload/esperanta.ico')),('/out:'+(Join-Path $buildRoot 'payload/EsperantaLauncher.exe')),(Join-Path $buildRoot 'src/Launcher.cs'))
& "$env:WINDIR/Microsoft.NET/Framework64/v4.0.30319/csc.exe" @argsList
if($LASTEXITCODE -ne 0){throw 'Launcher compilation failed'}
Copy-Item -LiteralPath (Join-Path $buildRoot 'src/Launcher.cs') -Destination (Join-Path $buildRoot 'payload/source/Launcher.cs') -Force
$payload=Join-Path $buildRoot 'payload'
$files=@(Get-ChildItem -LiteralPath $payload -File -Recurse | Where-Object Name -ne 'payload-manifest.json' | ForEach-Object {[ordered]@{path=$_.FullName.Substring($payload.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}})
@{version='2.16.0';files=$files} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $payload 'payload-manifest.json') -Encoding UTF8
& $InnoCompiler /Qp (Join-Path $buildRoot 'src/installer.iss')
if($LASTEXITCODE -ne 0){throw 'Installer compilation failed'}
$installer=Join-Path $buildRoot 'dist/EsperantaCompanion-2.16.0-Windows-x64-Setup.exe'
((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()+'  '+[IO.Path]::GetFileName($installer)) | Set-Content -LiteralPath (Join-Path $buildRoot 'dist/SHA256SUMS.txt') -Encoding ASCII
