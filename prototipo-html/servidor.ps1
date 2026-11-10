param([int]$Porta = 8765, [switch]$SemNavegador)
# Servidor local simples para o Debate Presidencial.
# O reconhecimento de voz do Chrome so funciona em http://localhost (nao em arquivo aberto direto).
$ErrorActionPreference = 'Stop'
$raiz = [IO.Path]::GetFullPath($PSScriptRoot)
$url = "http://localhost:$Porta/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
try { $listener.Start() } catch {
  Write-Host "A porta $Porta ja esta em uso - o jogo provavelmente ja esta rodando."
  if (-not $SemNavegador) { Start-Process $url }
  exit 1
}
Write-Host ""
Write-Host "  DEBATE PRESIDENCIAL rodando em $url"
Write-Host "  Deixe esta janela aberta enquanto joga. Para encerrar, feche-a."
Write-Host ""
if (-not $SemNavegador) {
  $chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($chrome) { Start-Process $chrome $url } else { Start-Process $url }
}
$tipos = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'
  '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'
  '.gif' = 'image/gif'; '.ico' = 'image/x-icon'; '.mp3' = 'audio/mpeg'; '.wav' = 'audio/wav'
}
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ([string]::IsNullOrEmpty($rel)) { $rel = 'debate.html' }
    $arq = [IO.Path]::GetFullPath([IO.Path]::Combine($raiz, $rel))
    if ($arq.StartsWith($raiz, [StringComparison]::OrdinalIgnoreCase) -and [IO.File]::Exists($arq)) {
      $bytes = [IO.File]::ReadAllBytes($arq)
      $ext = [IO.Path]::GetExtension($arq).ToLower()
      if ($tipos.ContainsKey($ext)) { $res.ContentType = $tipos[$ext] } else { $res.ContentType = 'application/octet-stream' }
      $res.Headers.Add('Cache-Control', 'no-store')
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
    }
  } catch {
    try { $res.StatusCode = 500 } catch {}
  } finally {
    $res.Close()
  }
}
