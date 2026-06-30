# Minimal static file server so the Paper Holder app can run from a USB stick on any
# Windows PC with nothing installed. It serves the folder this script lives in over a
# loopback socket (http://127.0.0.1) so the browser will load the ES modules -- which it
# refuses to do from a bare file:// path. Uses only built-in .NET, no admin rights.
#
# Launch via serve.bat (which sets the execution policy for this one run).

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))

$mime = @{
  '.html' = 'text/html; charset=utf-8';        '.htm'  = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8';  '.mjs'  = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8';         '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml';                   '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg';                       '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif';                        '.ico'  = 'image/x-icon'
  '.woff' = 'font/woff';                        '.woff2'= 'font/woff2'
  '.txt'  = 'text/plain; charset=utf-8'
}

# Bind to the first free port from 8000 upward (loopback only -> no firewall prompt).
$listener = $null
for ($p = 8000; $p -lt 8020; $p++) {
  try {
    $candidate = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
    $candidate.Start()
    $listener = $candidate
    $port = $p
    break
  } catch { }
}
if (-not $listener) { Write-Host "Could not open a local port (8000-8019)."; exit 1 }

$url = "http://127.0.0.1:$port/"
Write-Host ""
Write-Host "Paper Holder is serving from:" $root
Write-Host "Open in your browser:        " $url
Write-Host "Press Ctrl+C in this window to stop."
Write-Host ""
try { Start-Process $url } catch { }

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream)

      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrEmpty($requestLine)) { continue }
      while ($reader.Peek() -ge 0) { if ($reader.ReadLine() -eq '') { break } }  # drain headers

      $target = ($requestLine -split ' ')[1]
      if (-not $target) { $target = '/' }
      $path = [System.Uri]::UnescapeDataString(([System.Uri]"http://x$target").AbsolutePath)
      if ($path -eq '/') { $path = '/index.html' }

      $full = [System.IO.Path]::GetFullPath((Join-Path $root $path.TrimStart('/')))
      $ok = $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $full -PathType Leaf)

      if ($ok) {
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        $ct = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
        $header = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
      } else {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
        $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
      }

      $hb = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($hb, 0, $hb.Length)
      $stream.Write($bytes, 0, $bytes.Length)
      $stream.Flush()
    } catch {
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
