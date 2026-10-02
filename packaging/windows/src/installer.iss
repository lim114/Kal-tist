#define Version "2.16.0"
[Setup]
AppId={{781BA4E5-328C-4B8D-9982-229B8296DF65}
AppName=思衡托桌宠
AppVersion={#Version}
AppVerName=思衡托桌宠 {#Version}
AppPublisher=思衡托桌宠 · 个人定制版
DefaultDirName={localappdata}\Programs\EsperantaCompanion
DefaultGroupName=思衡托桌宠
PrivilegesRequired=lowest
ArchitecturesAllowed=x64os
ArchitecturesInstallIn64BitMode=x64os
MinVersion=10.0.19045
WizardStyle=modern
DisableWelcomePage=no
DisableProgramGroupPage=yes
AllowNoIcons=yes
UsePreviousAppDir=yes
OutputDir=..\dist
OutputBaseFilename=EsperantaCompanion-2.16.0-Windows-x64-Setup
SetupIconFile=..\payload\esperanta.ico
UninstallDisplayIcon={app}\esperanta.ico
LicenseFile=..\payload\LICENSE
InfoBeforeFile=..\payload\部署须知.txt
Compression=lzma2/normal
SolidCompression=yes
DiskSpanning=no
CloseApplications=no
RestartApplications=no
ExtraDiskSpaceRequired=104857600
VersionInfoVersion=2.16.0.0
VersionInfoDescription=思衡托桌宠安装程序

[Languages]
Name: chinesesimp; MessagesFile: "..\tools\ChineseSimplified.isl"

[Tasks]
Name: desktopicon; Description: "创建桌面快捷方式"; GroupDescription: "快捷方式："
Name: autostart; Description: "登录后随 Codex 打开而启动桌宠"; GroupDescription: "启动设置："; Flags: unchecked

[Files]
Source: "..\payload\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\思衡托桌宠"; Filename: "{app}\EsperantaLauncher.exe"; WorkingDir: "{app}"; IconFilename: "{app}\esperanta.ico"; AppUserModelID: "Esperanta.Companion.Installed"
Name: "{group}\部署环境检测"; Filename: "{app}\EsperantaLauncher.exe"; Parameters: "--check"; WorkingDir: "{app}"; IconFilename: "{app}\esperanta.ico"; AppUserModelID: "Esperanta.Companion.Installed"
Name: "{group}\兼容模式（软件渲染）"; Filename: "{app}\EsperantaLauncher.exe"; Parameters: "--software-rendering"; WorkingDir: "{app}"; IconFilename: "{app}\esperanta.ico"; AppUserModelID: "Esperanta.Companion.Installed"
Name: "{group}\部署与使用说明"; Filename: "{app}\部署须知.txt"
Name: "{group}\卸载思衡托桌宠"; Filename: "{uninstallexe}"
Name: "{autodesktop}\思衡托桌宠（安装版）"; Filename: "{app}\EsperantaLauncher.exe"; WorkingDir: "{app}"; IconFilename: "{app}\esperanta.ico"; AppUserModelID: "Esperanta.Companion.Installed"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "EsperantaCompanionInstalled"; ValueData: """{app}\EsperantaLauncher.exe"" --watch"; Tasks: autostart; Flags: uninsdeletevalue

[Run]
Filename: "{app}\EsperantaLauncher.exe"; Parameters: "--check"; Description: "查看本机部署检测报告"; Flags: postinstall skipifsilent
Filename: "{app}\EsperantaLauncher.exe"; Description: "启动思衡托桌宠"; Flags: postinstall skipifsilent nowait

[Code]
var EnvPage: TOutputMsgMemoWizardPage;

function InitializeSetup(): Boolean;
var Release: Cardinal;
begin
 Result := False;
 if not RegQueryDWordValue(HKLM64, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full', 'Release', Release) or (Release < 528040) then begin
  SuppressibleMsgBox('需要 .NET Framework 4.8 或更新版本。请先安装系统更新，再运行安装程序。', mbError, MB_OK, IDOK); exit;
 end;
 if not FileExists(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe')) then begin
  SuppressibleMsgBox('未找到 Windows PowerShell。请恢复系统 PowerShell 组件后重试。', mbError, MB_OK, IDOK); exit;
 end;
 Result := True;
end;

procedure InitializeWizard();
var Text, Value: String;
begin
 Text := '已通过：Windows 10 22H2 / Windows 11 x64、.NET 4.8、系统 PowerShell 基础检查。' + #13#10#13#10;
 if RegQueryStringValue(HKCR, 'codex\shell\open\command', '', Value) or RegQueryStringValue(HKCU, 'Software\Classes\codex\shell\open\command', '', Value) then
  Text := Text + 'Codex：已发现唤起协议。安装后会继续检查指令组件与本地任务目录。'
 else Text := Text + 'Codex：未发现标准唤起协议，安装后会进一步检查应用包。缺少 Codex 时仍可使用独立桌宠。';
 Text := Text + #13#10#13#10 + '音乐：安装后检测网易云客户端、Windows 媒体接口及本地连接。不会自动重启播放器、改变播放状态或修改网络代理。' + #13#10#13#10 + '完整运行时已内置，不需要安装 Node 或 Python。检测结果保存在当前用户的独立配置目录，开始菜单与任务面板均可重新检测。' + #13#10#13#10 + '显卡与远程桌面环境差异需首次运行验证；提供软件渲染兼容模式。' + #13#10#13#10 + '此安装版使用独立目录，不覆盖原工作区中的桌宠。请勿选择旧版源码目录作为安装位置。';
 EnvPage := CreateOutputMsgMemoPage(wpWelcome, '部署环境检查', '基础条件已通过；集成功能将在安装后进一步检测', '', Text);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var Dir: String;
begin
 Result := ''; Dir := ExpandConstant('{app}');
 if FileExists(Dir+'\app\main.cjs') and not FileExists(Dir+'\installation.json') then
  Result := '该目录包含原有桌宠或未识别的程序。为保留原程序，请返回并选择独立目录。';
end;

procedure CurStepChanged(CurStep: TSetupStep);
var Code: Integer; Mode: String;
begin
 if CurStep = ssPostInstall then begin
  if WizardIsTaskSelected('autostart') then Mode := '--configure=on' else Mode := '--configure=off';
  if not Exec(ExpandConstant('{app}\EsperantaLauncher.exe'), Mode, ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, Code) or (Code <> 0) then
   RaiseException('无法初始化当前用户配置，请检查目录权限。');
  if not Exec(ExpandConstant('{app}\EsperantaLauncher.exe'), '--doctor-only', ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, Code) or (Code <> 0) then
   RaiseException('部署环境检测存在必需项错误。请查看 %APPDATA%\EsperantaCompanion\environment-report.html，修复后重新安装。');
 end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var Code: Integer;
begin
 if CurUninstallStep = usUninstall then
  Exec(ExpandConstant('{app}\EsperantaLauncher.exe'), '--configure=off', ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, Code);
end;
