@echo off
REM Double-click to run the Paper Holder app from this folder (USB-friendly, no install).
REM Uses the PowerShell that ships with Windows; -ExecutionPolicy Bypass is per-run only.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
