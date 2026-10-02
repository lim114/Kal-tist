param([switch]$Probe)
$ErrorActionPreference='Stop'
[Console]::InputEncoding=New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -Path (Join-Path $PSScriptRoot 'MediaArtwork.dll')
$null=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
$null=[Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime]
$taskMethod=([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'})[0]
function Await($operation,$type){$task=$taskMethod.MakeGenericMethod($type).Invoke($null,@($operation));if(-not $task.Wait(6000)){throw 'Windows media request timed out'};$task.Result}
function Emit($value){[Console]::WriteLine((ConvertTo-Json -InputObject $value -Depth 6 -Compress))}
$manager=Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$artKey='';$art='';$artAt=0
function NetEaseSession {
    # Only explicit NetEase IDs; never control the unrelated system current player.
    $sessions=@($manager.GetSessions() | Where-Object {$_.SourceAppUserModelId -match '(?i)cloudmusic|netease|163music'})
    $playing=@($sessions | Where-Object {[string]$_.GetPlaybackInfo().PlaybackStatus -eq 'Playing'})
    if($playing.Count){return $playing[0]};if($sessions.Count){return $sessions[0]};return $null
}
function Snapshot {
    $s=NetEaseSession
    if($null -eq $s){$script:artKey='';$script:art='';return @{connected=$false;available=$true;reason='no-session';playing=$false;artwork='';title='';duration=0;position=0;observedAt=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();controls=@{}}}
    $m=Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $p=$s.GetPlaybackInfo();$t=$s.GetTimelineProperties();$c=$p.Controls
    $key=$s.SourceAppUserModelId+'|'+$m.Title+'|'+$m.Artist+'|'+$m.AlbumTitle
    $now=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    if($key -ne $script:artKey -or (-not $script:art -and $now-$script:artAt -gt 10000)){
        $script:artKey=$key;$script:art='';$script:artAt=$now
        if($m.Thumbnail){
            try {$script:art=[MediaArtwork]::Read($m.Thumbnail)}catch{if($Probe){[Console]::Error.WriteLine($_.Exception.Message)}}
        }
    }
    $start=$t.StartTime.TotalSeconds;$duration=[Math]::Max(0,$t.EndTime.TotalSeconds-$start)
    $stamp=$t.LastUpdatedTime.ToUnixTimeMilliseconds();if($stamp -lt 1 -or $stamp -gt $now+1000){$stamp=$now}
    $rate=1;if($null -ne $p.PlaybackRate){$rate=[double]$p.PlaybackRate}
    return @{connected=$true;available=$true;source=$s.SourceAppUserModelId;title=[string]$m.Title;artist=[string]$m.Artist;album=[string]$m.AlbumTitle;artwork=$script:art;repeat=[string]$p.AutoRepeatMode;shuffle=$p.IsShuffleActive;playing=([string]$p.PlaybackStatus -eq 'Playing');playbackStatus=[string]$p.PlaybackStatus;position=[Math]::Max(0,$t.Position.TotalSeconds-$start);duration=$duration;observedAt=$stamp;rate=$rate;controls=@{play=$c.IsPlayEnabled;pause=$c.IsPauseEnabled;toggle=$c.IsPlayPauseToggleEnabled;next=$c.IsNextEnabled;previous=$c.IsPreviousEnabled;repeat=$c.IsRepeatEnabled;shuffle=$c.IsShuffleEnabled;seek=($c.IsPlaybackPositionEnabled -and $duration -gt 0)}}
}
if($Probe){Emit (Snapshot);exit}
while($null -ne ($line=[Console]::ReadLine())){
    $id=$null
    try {
        $q=$line | ConvertFrom-Json;$id=$q.id
        if($q.command -eq 'snapshot'){Emit @{id=$id;ok=$true;state=(Snapshot)};continue}
        $s=NetEaseSession;if(-not $s){throw 'NetEase has no Windows media session'}
        if($q.source -ne $s.SourceAppUserModelId){throw 'Media source changed; refresh before control'}
        $c=$s.GetPlaybackInfo().Controls;$operation=$null
        switch($q.command){
            'play' {if(-not $c.IsPlayEnabled){throw 'Play is not supported'};$operation=$s.TryPlayAsync()}
            'pause' {if(-not $c.IsPauseEnabled){throw 'Pause is not supported'};$operation=$s.TryPauseAsync()}
            'toggle' {if(-not $c.IsPlayPauseToggleEnabled){throw 'Toggle is not supported'};$operation=$s.TryTogglePlayPauseAsync()}
            'next' {if(-not $c.IsNextEnabled){throw 'Next is not supported'};$operation=$s.TrySkipNextAsync()}
            'previous' {if(-not $c.IsPreviousEnabled){throw 'Previous is not supported'};$operation=$s.TrySkipPreviousAsync()}
            'repeat' {if(-not $c.IsRepeatEnabled){throw 'Repeat is not supported'};if($q.mode -notin @('None','Track','List')){throw 'Invalid repeat mode'};$operation=$s.TryChangeAutoRepeatModeAsync([Windows.Media.MediaPlaybackAutoRepeatMode]([Enum]::Parse([Windows.Media.MediaPlaybackAutoRepeatMode],$q.mode)))}
            'shuffle' {if(-not $c.IsShuffleEnabled){throw 'Shuffle is not supported'};$operation=$s.TryChangeShuffleActiveAsync([bool]$q.enabled)}
            'seek' {if(-not $c.IsPlaybackPositionEnabled){throw 'Seek is not supported'};$t=$s.GetTimelineProperties();$sec=[double]$q.position;if([double]::IsNaN($sec) -or [double]::IsInfinity($sec)){throw 'Invalid position'};$ticks=[int64]([Math]::Max($t.StartTime.Ticks,[Math]::Min($t.EndTime.Ticks,$t.StartTime.Ticks+$sec*10000000)));$operation=$s.TryChangePlaybackPositionAsync($ticks)}
            default {throw 'Unknown media command'}
        }
        $ok=Await $operation ([bool]);if(-not $ok){throw 'Player did not accept the command'}
        Emit @{id=$id;ok=$true;state=(Snapshot)}
    } catch {Emit @{id=$id;ok=$false;error=$_.Exception.Message}}
}
