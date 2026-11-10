@echo off
title Debate Presidencial Online - servidor
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale em https://nodejs.org e tente de novo.
  pause
  exit /b
)
if not exist node_modules (
  echo Instalando dependencias, aguarde...
  call npm install
)
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
node server/index.js
pause
