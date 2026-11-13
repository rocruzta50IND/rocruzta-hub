# Roda DENTRO do Windows Sandbox (pasta C:\teste mapeada do computador). Instala o Hub, instala o Termix PELO Hub,
# abre o Termix dentro do Hub, desinstala e instala de novo. Resultado em C:\teste\resultado.txt.
$ErrorActionPreference = 'Continue'
$log = 'C:\teste\resultado.txt'
function L($t) { "$(Get-Date -f HH:mm:ss) $t" | Out-File $log -Append -Encoding utf8 }
$hubDir = "$env:LOCALAPPDATA\Programs\Rocruzta Hub"
$hub = "$hubDir\Rocruzta Hub.exe"
function Atalhos { Get-ChildItem ([Environment]::GetFolderPath('Desktop')), ([Environment]::GetFolderPath('CommonDesktopDirectory')) -Filter *.lnk -ErrorAction SilentlyContinue | % { $_.Name } }
function IniciarHub { Start-Process $hub -ArgumentList '--remote-debugging-port=9333'; Start-Sleep 6 }
function PararHub { Get-Process 'Rocruzta Hub', 'Termix' -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep 2 }
function Driver($passo) {
  $env:ELECTRON_RUN_AS_NODE = '1'
  & $hub 'C:\teste\driver.js' $passo 2>&1 | % { L "  $_" }
  Remove-Item Env:\ELECTRON_RUN_AS_NODE
}
function Termix { Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall', 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall' -ErrorAction SilentlyContinue | Get-ItemProperty | ? { $_.DisplayName -like 'Termix*' } | % { $_.DisplayName } }

L '== 1. instalar o Hub (silencioso)'
$p = Start-Process 'C:\teste\Rocruzta-Hub-Setup-0.1.0.exe' -ArgumentList '/S' -Wait -PassThru
L "instalador do Hub saiu com $($p.ExitCode); exe existe: $(Test-Path $hub)"
L "atalhos na area de trabalho: $((Atalhos) -join ', ')"
L "Termix instalado antes: [$((Termix) -join ',')]"

L '== 2. Hub instala o Termix'
IniciarHub; Driver 'instalar'
L "Termix no registro: [$((Termix) -join ',')]"
L "atalhos na area de trabalho: $((Atalhos) -join ', ')  (Termix.lnk NAO deve aparecer)"
PararHub

L '== 3. Hub abre o Termix dentro da janela'
IniciarHub; Driver 'abrir'
L "processos --embed: $(@(Get-CimInstance Win32_Process | ? { $_.CommandLine -match '--embed' -and $_.Name -match 'Termix' }).Count)"
PararHub

L '== 4. botao Desinstalar do Hub'
IniciarHub; Driver 'desinstalar'
$desinst = @(Get-Process | ? { $_.ProcessName -match 'Uninstall' })
L "processos de desinstalacao: [$((Get-Process | ? { $_.ProcessName -match 'Uninstall|^Au_|Setup' } | % { $_.ProcessName }) -join ',')]"
$desinst | Stop-Process -Force
PararHub
$u = "$env:LOCALAPPDATA\Programs\Termix\Uninstall Termix.exe"
if (Test-Path $u) {
  Start-Process $u -ArgumentList '/S', '/currentuser' -Wait
  # o desinstalador NSIS se copia para a pasta temporária e sai: espera o processo copiado e o registro sumirem
  for ($i = 0; $i -lt 60 -and (@(Get-Process | ? { $_.ProcessName -match 'Uninstall|^Au_' }).Count -gt 0 -or @(Termix).Count -gt 0); $i++) { Start-Sleep 2 }
}
L "Termix no registro apos desinstalar: [$((Termix) -join ',')]"

L '== 5. Hub instala o Termix de novo'
IniciarHub; Driver 'instalar-de-novo'
L "Termix no registro: [$((Termix) -join ',')]"
L "atalhos na area de trabalho: $((Atalhos) -join ', ')"
L "processos: [$((Get-Process | ? { $_.ProcessName -match 'Uninstall|^Au_|Setup|Termix' } | % { $_.ProcessName }) -join ',')]"
L "temp do Hub: [$((Get-ChildItem "$env:TEMP\rocruzta-hub" -ErrorAction SilentlyContinue | % { $_.Name + ' ' + $_.Length }) -join ',')]"
PararHub
L 'fim'
