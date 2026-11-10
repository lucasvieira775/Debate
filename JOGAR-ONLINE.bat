@echo off
title Debate Presidencial Online - link publico
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias, aguarde...
  call npm install
)
start "Servidor do Debate" cmd /k node server/index.js
set "CF=cloudflared"
where cloudflared >nul 2>nul
if errorlevel 1 set "CF=C:\Program Files (x86)\cloudflared\cloudflared.exe"
echo.
echo  ==============================================================
echo   Gerando um link HTTPS publico para seus amigos jogarem.
echo   Procure abaixo o endereco que termina em .trycloudflare.com
echo   e mande para eles. O microfone funciona nesse link.
echo   Deixe esta janela e a do servidor abertas durante o jogo.
echo  ==============================================================
echo.
timeout /t 2 >nul
"%CF%" tunnel --url http://localhost:3000
pause
