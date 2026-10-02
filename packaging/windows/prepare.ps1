param([string]$RuntimeDirectory)
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if(-not $RuntimeDirectory){$RuntimeDirectory=Join-Path $repo 'runtime'}
if(-not(Test-Path -LiteralPath (Join-Path $RuntimeDirectory 'electron.exe'))){throw 'Specify a Windows x64 Electron 44.4.5 runtime directory using -RuntimeDirectory.'}
if(-not(Test-Path -LiteralPath (Join-Path $RuntimeDirectory 'version')) -or (Get-Content -LiteralPath (Join-Path $RuntimeDirectory 'version') -Raw).Trim() -ne '44.4.5'){throw 'Expected Electron 44.4.5.'}
$payload=Join-Path $PSScriptRoot 'payload'
if(Test-Path -LiteralPath $payload){throw 'Payload already exists. Use a fresh build directory to avoid stale files.'}
New-Item -ItemType Directory -Path (Join-Path $payload 'source') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $repo 'app') -Destination (Join-Path $payload 'app') -Recurse
Copy-Item -LiteralPath $RuntimeDirectory -Destination (Join-Path $payload 'runtime') -Recurse
Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'resources') -File | ForEach-Object {Copy-Item -LiteralPath $_.FullName -Destination $payload}
Copy-Item -LiteralPath (Join-Path $repo 'LICENSE') -Destination $payload
Copy-Item -LiteralPath (Join-Path $repo 'app\assets\theme\esperanta-app.ico') -Destination (Join-Path $payload 'esperanta.ico')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'src\lifecycle-installed.cjs') -Destination (Join-Path $payload 'app\lifecycle.cjs') -Force
function Replace-Code($file,$old,$new){
 $p=Join-Path $payload ('app\'+$file);$text=[IO.File]::ReadAllText($p)
 if(-not $text.Contains($old)){throw ('Source changed; review installer adaptation: '+$file)}
 [IO.File]::WriteAllText($p,$text.Replace($old,$new),(New-Object Text.UTF8Encoding($false)))
}
Replace-Code 'main.cjs' "app.commandLine.appendSwitch('enable-font-antialiasing');" "app.commandLine.appendSwitch('enable-font-antialiasing');if(process.argv.includes('--software-rendering')){app.disableHardwareAcceleration();app.commandLine.appendSwitch('use-angle','swiftshader');app.commandLine.appendSwitch('enable-unsafe-swiftshader')}"
Replace-Code 'main.cjs' "dataDir=path.join(root,'data')" "dataDir=process.env.ESPERANTA_DATA_DIR||path.join(app.getPath('appData'),'EsperantaCompanion')"
Replace-Code 'main.cjs' "cwd:path.resolve(root,'../..')" "cwd:app.getPath('documents')"
Replace-Code 'main.cjs' "case 'conversationMode':" "case 'environmentCheck':{const child=require('child_process').spawn(path.join(root,'EsperantaLauncher.exe'),['--check'],{windowsHide:true,detached:true,stdio:'ignore'});child.on('error',()=>{});child.unref();break;}case 'conversationMode':"
Replace-Code 'panel.html' '<nav>' '<nav><button id="environment">环境检测</button>'
Replace-Code 'panel.html' '<footer>' '<p id="deploymentHint" class="hint">新电脑请先运行环境检测；ChatGPT/工作模式需在本机重新配置连接。</p><footer>'
Replace-Code 'panel.js' "`$('hide').onclick" "`$('environment').onclick=safe(()=>call('environmentCheck'));`$('hide').onclick"
Replace-Code 'app-identity.cjs' 'Esperanta.Companion.Desktop' 'Esperanta.Companion.Installed'
$oldCommand='relaunchCommand:`"${process.execPath}" "${__dirname}"`'
$newCommand='relaunchCommand:`"${path.join(__dirname,''..'',''EsperantaLauncher.exe'')}"`'
Replace-Code 'app-identity.cjs' $oldCommand $newCommand
$p=Join-Path $payload 'app\package.json';$meta=Get-Content -LiteralPath $p -Raw | ConvertFrom-Json;$meta.version='2.16.0';$meta|ConvertTo-Json|Set-Content -LiteralPath $p -Encoding utf8
