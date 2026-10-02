using System;
using System.IO;
using System.Diagnostics;
using System.Collections.Generic;
using System.Threading;
using System.Linq;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using Microsoft.Win32;
[assembly:System.Reflection.AssemblyTitle("思衡托桌宠")]
[assembly:System.Reflection.AssemblyVersion("2.16.0.0")]
class Launcher {
 static readonly string Root=AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
 static readonly string Data=Environment.GetEnvironmentVariable("ESPERANTA_DATA_DIR")??Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),"EsperantaCompanion");
 static readonly string Exe=Path.Combine(Root,"EsperantaLauncher.exe");
 static readonly string Settings=Path.Combine(Data,"settings.json");
 static readonly JavaScriptSerializer Json=new JavaScriptSerializer();
 static string Q(string s){return "\""+s.Replace("\"","\\\"")+"\"";}
 static Process Start(string file,string args){var info=new ProcessStartInfo(file,args){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,WorkingDirectory=Root};if(Path.GetFileName(file).Equals("powershell.exe",StringComparison.OrdinalIgnoreCase))info.EnvironmentVariables["PSModulePath"]=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),@"WindowsPowerShell\v1.0\Modules")+";"+Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),@"WindowsPowerShell\Modules");return Process.Start(info);}
 static Dictionary<string,object> ReadSettings(){try{return Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(Settings));}catch{return new Dictionary<string,object>();}}
 static bool Auto(){object v;return ReadSettings().TryGetValue("autoStart",out v)&&v is bool&&(bool)v;}
 static void Initialize(){Directory.CreateDirectory(Data);if(File.Exists(Settings))return;var docs=Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);var working=Path.Combine(docs,"EsperantaTasks");Directory.CreateDirectory(working);File.WriteAllText(Settings,Json.Serialize(new{size=260,facing="auto",gaze=true,autoStart=false,bubbleHidden=true,mediaDetached=false,cwd=working}));}
 static void Configure(bool enabled){Initialize();var s=ReadSettings();s["autoStart"]=enabled;File.WriteAllText(Settings,Json.Serialize(s));using(var key=Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run")){if(enabled)key.SetValue("EsperantaCompanionInstalled",Q(Exe)+" --watch");else{string value=key.GetValue("EsperantaCompanionInstalled","").ToString();if(value.StartsWith(Q(Exe),StringComparison.OrdinalIgnoreCase))key.DeleteValue("EsperantaCompanionInstalled",false);}}}
 static int Doctor(){Directory.CreateDirectory(Data);var ps=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),@"WindowsPowerShell\v1.0\powershell.exe");var p=Start(ps,"-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "+Q(Path.Combine(Root,"Check-Environment.ps1"))+" -InstallRoot "+Q(Root)+" -DataDirectory "+Q(Data)+" -Quiet");if(!p.WaitForExit(60000)){p.Kill();return 21;}return p.ExitCode;}
 static bool CodexOpen(){foreach(string name in new[]{"ChatGPT","Codex"})foreach(var p in Process.GetProcessesByName(name)){try{string path=p.MainModule.FileName;if(path.IndexOf(@"\OpenAI.Codex_",StringComparison.OrdinalIgnoreCase)>=0||path.IndexOf(@"\OpenAI\Codex\",StringComparison.OrdinalIgnoreCase)>=0)return true;}catch{}finally{p.Dispose();}}return false;}
 static void LaunchPet(string flags){Start(Path.Combine(Root,@"runtime\electron.exe"),Q(Path.Combine(Root,"app"))+" "+flags);}
 static void Watch(){string id;using(var sha=System.Security.Cryptography.SHA256.Create())id=BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(Root.ToLowerInvariant()))).Replace("-","").Substring(0,16);using(var mutex=new Mutex(false,@"Local\EsperantaInstalledWatcher-"+id)){if(!mutex.WaitOne(0,false))return;try{bool wasOpen=false;while(File.Exists(Exe)&&Auto()){bool open=CodexOpen();if(open&&!wasOpen)LaunchPet("--auto");wasOpen=open;Thread.Sleep(3000);}}finally{mutex.ReleaseMutex();}}}
 [STAThread] static int Main(string[] args){bool quiet=args.Contains("--doctor-only")||args.Any(a=>a.StartsWith("--configure="))||args.Contains("--watch");try{
  if(args.Contains("--watch")){Watch();return 0;}
  if(args.Contains("--configure=on")||args.Contains("--configure=off")){Configure(args.Contains("--configure=on"));return 0;}
  if(args.Contains("--check")||args.Contains("--doctor-only")){int code=Doctor();if(args.Contains("--check")){var report=Path.Combine(Data,"environment-report.html");if(File.Exists(report))Process.Start(new ProcessStartInfo(report){UseShellExecute=true});else throw new Exception("无法生成部署检测报告，请检查 Windows PowerShell 是否被策略禁用。");}return code;}
  int build;int.TryParse(Convert.ToString(Registry.GetValue(@"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion","CurrentBuildNumber","0")),out build);if(!Environment.Is64BitOperatingSystem||build<19045)throw new Exception("本安装包需要 Windows 10 22H2 / Windows 11 x64。请使用受支持的系统。");
  bool first=!File.Exists(Path.Combine(Data,"first-launch.done"));Initialize();if(first||!File.Exists(Path.Combine(Data,"environment-report.json"))){int code=Doctor();if(code!=0)throw new Exception("部署环境检测未通过，请从开始菜单打开“部署环境检测”查看原因。错误码："+code);}
  LaunchPet((args.Contains("--software-rendering")?"--software-rendering ":"")+(first?"--first-run":""));File.WriteAllText(Path.Combine(Data,"first-launch.done"),DateTime.UtcNow.ToString("o"));if(Auto())Start(Exe,"--watch");return 0;
 }catch(Exception e){if(!quiet)MessageBox.Show(e.Message,"思衡托 · 无法启动",MessageBoxButtons.OK,MessageBoxIcon.Warning);return 20;}}
}
