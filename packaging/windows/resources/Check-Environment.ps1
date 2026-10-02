param([string]$InstallRoot=$PSScriptRoot,[string]$DataDirectory=(Join-Path $env:APPDATA 'EsperantaCompanion'),[switch]$Quiet)
$ErrorActionPreference='Stop'
$checks=New-Object System.Collections.Generic.List[object]
function Check($name,$status,$detail){$checks.Add([pscustomobject]@{name=$name;status=$status;detail=$detail})}
function Encode($text){[System.Net.WebUtility]::HtmlEncode([string]$text)}
try {
 $os=Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
 $build=[int]$os.CurrentBuildNumber
 $arch=[Environment]::GetEnvironmentVariable('PROCESSOR_ARCHITECTURE','Machine')
 Check 'Windows 版本与架构' $(if($build -ge 19045 -and $arch -eq 'AMD64'){'pass'}else{'fail'}) ('Build '+$build+' / '+$arch+'；要求 Windows 10 22H2 或 Windows 11 x64。ARM 和 32 位系统不在此包支持范围。')
 $net=(Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full' -ErrorAction SilentlyContinue).Release
 Check '.NET Framework' $(if($net -ge 528040){'pass'}else{'fail'}) ('.NET 4.8 或更新；当前 Release '+$net)
 Check 'Windows PowerShell' $(if($PSVersionTable.PSVersion -ge [version]'5.1'){'pass'}else{'fail'}) ('版本 '+$PSVersionTable.PSVersion+'；媒体接口使用系统 PowerShell。')
 Check '脚本运行策略' $(if($ExecutionContext.SessionState.LanguageMode -eq 'FullLanguage'){'pass'}else{'warn'}) ('语言模式：'+$ExecutionContext.SessionState.LanguageMode+'；受限模式可能使媒体连接不可用。')
 New-Item -ItemType Directory -Path $DataDirectory -Force | Out-Null
 $probe=Join-Path $DataDirectory ('.write-check-'+[Guid]::NewGuid().ToString('N'))
 try{[IO.File]::WriteAllText($probe,'ok');[IO.File]::Delete($probe);Check '用户配置目录' 'pass' '当前用户可读写；配置与程序安装文件分开保存。'}catch{Check '用户配置目录' 'fail' '无法写入用户配置目录，请检查目录权限。'}
 $drive=New-Object IO.DriveInfo([IO.Path]::GetPathRoot($DataDirectory))
 Check '可用磁盘空间' $(if($drive.AvailableFreeSpace -ge 500MB){'pass'}else{'warn'}) ('配置盘剩余 '+[Math]::Round($drive.AvailableFreeSpace/1GB,2)+' GB；建议至少保留 500 MB。')
 $manifest=Get-Content -LiteralPath (Join-Path $InstallRoot 'payload-manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 $bad=New-Object System.Collections.Generic.List[string]
 foreach($entry in $manifest.files){$file=Join-Path $InstallRoot $entry.path;if(-not(Test-Path -LiteralPath $file -PathType Leaf)){$bad.Add($entry.path)}elseif((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $entry.sha256){$bad.Add($entry.path)}}
 Check '程序与运行库完整性' $(if($bad.Count -eq 0){'pass'}else{'fail'}) $(if($bad.Count){'缺失或变动文件：'+($bad -join '、')}else{'Electron 44.4.5 与 '+$manifest.files.Count+' 个程序文件校验通过，无需另装 Node / Python。'})
 $codexCommand=$null
 foreach($key in @('HKCU:\Software\Classes\codex\shell\open\command','Registry::HKEY_CLASSES_ROOT\codex\shell\open\command')){if(Test-Path $key){$codexCommand=(Get-Item $key).GetValue('');break}}
 $package=@(Get-AppxPackage -Name 'OpenAI.Codex' -ErrorAction SilentlyContinue)
 Check 'Codex 客户端' $(if($codexCommand -or $package.Count){'pass'}else{'warn'}) $(if($codexCommand -or $package.Count){'检测到 Codex 安装或唤起协议；账户需在此电脑自行登录。'}else{'未检测到 Codex。桌宠可独立显示；任务同步、唤起与指令功能需要先安装并打开 Codex。'})
 $cliRoot=Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin'
 $cli=@(Get-ChildItem -LiteralPath $cliRoot -Filter codex.exe -Recurse -ErrorAction SilentlyContinue)
 Check 'Codex 指令组件' $(if($cli.Count){'pass'}else{'warn'}) $(if($cli.Count){'已找到本机 Codex 指令组件；不读取或复制账户凭据。'}else{'尚未找到本机指令组件。请先打开 Codex 完成初始化，再重新检测。'})
 $homeDir=if($env:CODEX_HOME){$env:CODEX_HOME}else{Join-Path $env:USERPROFILE '.codex'}
 Check 'Codex 任务目录' $(if(Test-Path -LiteralPath (Join-Path $homeDir 'sessions')){'pass'}else{'warn'}) '首次登录并执行任务后创建；本检查不读取聊天内容。'
 Check 'ChatGPT 聊天与工作模式' 'warn' '安装包不包含会话绑定或桥接上下文。新电脑需基于本机真实 Codex 任务重新配置连接；未配置时使用 Codex 模式。不得复制其他电脑的会话上下文冒充连接。'
 $music=$null
 foreach($key in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\cloudmusic.exe','HKLM:\Software\Microsoft\Windows\CurrentVersion\App Paths\cloudmusic.exe','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\cloudmusic.exe')){if(Test-Path $key){$value=(Get-Item $key).GetValue('');if($value -and (Test-Path -LiteralPath $value.Trim('"'))){$music=$value.Trim('"');break}}}
 Check '网易云音乐' $(if($music){'pass'}else{'warn'}) $(if($music){'检测到版本 '+(Get-Item -LiteralPath $music).VersionInfo.ProductVersion+'；完整进度/循环控制已实测 3.1.40，其他版本须实际连接确认。'}else{'未检测到网易云客户端；音乐功能可稍后安装客户端再启用，桌宠与 Codex 功能不受影响。'})
 try {Add-Type -AssemblyName System.Runtime.WindowsRuntime;$null=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime];Check 'Windows 媒体接口' 'pass' '系统媒体会话 API 可用。'}catch{Check 'Windows 媒体接口' 'warn' '系统媒体会话 API 不可用；请检查系统组件，音乐功能可能受限。'}
 try{$targets=Invoke-RestMethod -Uri 'http://127.0.0.1:19263/json' -TimeoutSec 2;if(@($targets | Where-Object {$_.type -eq 'page' -and $_.url -like 'orpheus://*'}).Count){Check '音乐本地连接' 'pass' '已找到网易云本地控制入口；不读取歌单与账户。'}else{Check '音乐本地连接' 'warn' '19263 端口由其他服务使用；不会连接或控制该服务。'}}catch{Check '音乐本地连接' 'warn' '尚未建立本地控制连接。需要进度/循环控制时，请先正常退出网易云，再从桌宠的“打开网易云”按钮启动。不会自动终止播放器。'}
 $renderFile=Join-Path $DataDirectory 'render-status.json'
 if(Test-Path -LiteralPath $renderFile){$render=Get-Content -LiteralPath $renderFile -Raw -Encoding UTF8 | ConvertFrom-Json;Check '图形渲染' $(if($render.error){'warn'}else{'pass'}) $(if($render.error){'上次渲染未成功。可从开始菜单使用“兼容模式（软件渲染）”，并更新显卡驱动。'}else{'上次运行 '+$render.fps+' FPS；若换过显卡或远程桌面环境，请启动后复查。'})}else{Check '图形渲染' 'info' '将在首次启动时实际初始化 WebGL；若角色无法显示，可使用开始菜单的兼容模式（软件渲染）。'}
}catch{Check '检测程序' 'fail' ('环境检查未完成：'+$_.Exception.Message)}
$fatal=@($checks|Where-Object status -eq 'fail').Count
$warnings=@($checks|Where-Object status -eq 'warn').Count
$report=[ordered]@{version='2.16.0';checkedAt=(Get-Date -Format o);ok=($fatal -eq 0);failures=$fatal;warnings=$warnings;checks=$checks}
New-Item -ItemType Directory -Path $DataDirectory -Force | Out-Null
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $DataDirectory 'environment-report.json') -Encoding UTF8
$rows=($checks|ForEach-Object{'<tr><td>'+ (Encode $_.name)+'</td><td class="'+$_.status+'">'+(@{pass='通过';warn='需配置';fail='未通过';info='待验证'}[$_.status])+'</td><td>'+(Encode $_.detail)+'</td></tr>'}) -join "`n"
$title=if($fatal){'存在无法运行的问题'}elseif($warnings){'可运行，部分集成需要配置'}else{'环境检测通过'}
$html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>思衡托 · 部署环境检测</title><style>body{font:15px/1.6 "Segoe UI","Microsoft YaHei",sans-serif;max-width:1040px;margin:36px auto;padding:0 24px;background:#172b22;color:#e2ebdc}h1{font-weight:500}table{border-collapse:collapse;width:100%}td,th{text-align:left;border-bottom:1px solid #526948;padding:13px}td:first-child{width:180px}td:nth-child(2){width:80px}.pass{color:#b8d789}.warn{color:#e1c78a}.fail{color:#ffafa1}.info,p{color:#a8bba4}</style><h1>'+ $title+'</h1><p>思衡托 2.16.0 · '+(Encode $report.checkedAt)+'。检测仅在本机完成，不上传账号、密钥或对话资料。</p><table><tr><th>检查项</th><th>结果</th><th>说明与处理方式</th></tr>'+$rows+'</table><p>此包面向 Windows 10 22H2 / Windows 11 x64。通过基础检测不等于每种显卡与客户端版本都已实机验证；可随时从任务面板或开始菜单重新检测。</p></html>'
[IO.File]::WriteAllText((Join-Path $DataDirectory 'environment-report.html'),$html,(New-Object Text.UTF8Encoding($false)))
if(-not $Quiet){Invoke-Item -LiteralPath (Join-Path $DataDirectory 'environment-report.html')}
if($fatal){exit 20}else{exit 0}
