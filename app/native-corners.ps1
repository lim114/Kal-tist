param([string]$WindowHandle,[uint32]$OwnerProcessId)
$ErrorActionPreference='Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class PetGlassCorners {
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint pid);
 [DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr hwnd,int attr,ref int value,int size);
}
'@
$handle=[IntPtr]([long]::Parse($WindowHandle));$owner=[uint32]0
[void][PetGlassCorners]::GetWindowThreadProcessId($handle,[ref]$owner)
if($owner -ne $OwnerProcessId){throw 'Window owner changed'}
$round=2
$result=[PetGlassCorners]::DwmSetWindowAttribute($handle,33,[ref]$round,4)
if($result -ne 0){throw ('DWM corner preference failed: '+$result)}
