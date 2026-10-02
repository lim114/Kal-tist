using System;
using System.Threading;
using Windows.Foundation;
using Windows.Storage.Streams;
public static class MediaArtwork {
 static T Wait<T>(IAsyncOperation<T> op){var info=(IAsyncInfo)op;var until=DateTime.UtcNow.AddSeconds(6);while(info.Status==AsyncStatus.Started){if(DateTime.UtcNow>until){info.Cancel();throw new TimeoutException();}Thread.Sleep(15);}return op.GetResults();}
 public static string Read(RandomAccessStreamReference reference) {
  using(var stream=Wait(reference.OpenReadAsync())) {
   if(stream.Size==0||stream.Size>4194304)return "";
   using(var reader=new DataReader(stream.GetInputStreamAt(0))) {
    uint n=Wait(reader.LoadAsync((uint)stream.Size));
    var bytes=new byte[n];reader.ReadBytes(bytes);
    string mime=stream.ContentType;
    if(mime!="image/png"&&mime!="image/jpeg"&&mime!="image/webp"&&mime!="image/bmp"&&mime!="image/gif")mime="image/png";
    return "data:"+mime+";base64,"+Convert.ToBase64String(bytes);
   }
  }
 }
}
