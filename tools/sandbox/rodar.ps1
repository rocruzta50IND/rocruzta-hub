# Roda no computador (não no Sandbox): copia o instalador do Hub e os scripts para uma pasta de teste, abre o Windows Sandbox
# e espera o resultado. Uso (no repositório): powershell -File tools\sandbox\rodar.ps1 [-Pasta D:\sandbox-hub]
# Antes: npm run empacotar (gera dist\Rocruzta-Hub-Setup-<versão>.exe). Feche qualquer Sandbox aberto.
param([string]$Pasta = 'D:\sandbox-hub', [string]$Versao = '')
$repo = Resolve-Path "$PSScriptRoot\..\.."
$utf8 = [Text.Encoding]::UTF8
New-Item -ItemType Directory -Force $Pasta | Out-Null
Remove-Item "$Pasta\resultado.txt" -ErrorAction SilentlyContinue
Get-ChildItem $Pasta -Filter 'Rocruzta-Hub-Setup-*.exe' | Remove-Item -Force
# -Versao escolhe qual instalador testar (no teste de atualização, uma versão ANTERIOR à última release do GitHub)
$filtro = if ($Versao) { "Rocruzta-Hub-Setup-$Versao.exe" } else { 'Rocruzta-Hub-Setup-*.exe' }
Copy-Item (Get-ChildItem "$repo\dist\$filtro" | Sort-Object LastWriteTime | Select-Object -Last 1).FullName, "$PSScriptRoot\driver.js" $Pasta -Force
# o teste usa o nome real do instalador; o .ps1 vai com BOM (PowerShell 5 lê acentos) e o .wsb sem BOM (o Sandbox rejeita BOM)
$setup = Get-ChildItem $Pasta -Filter 'Rocruzta-Hub-Setup-*.exe' | Select-Object -First 1
$teste = [IO.File]::ReadAllText("$PSScriptRoot\teste.ps1", $utf8).Replace('Rocruzta-Hub-Setup-0.1.0.exe', $setup.Name)
[IO.File]::WriteAllText("$Pasta\teste.ps1", $teste, (New-Object Text.UTF8Encoding($true)))
$wsb = "<Configuration><MappedFolders><MappedFolder><HostFolder>$Pasta</HostFolder><SandboxFolder>C:\teste</SandboxFolder><ReadOnly>false</ReadOnly></MappedFolder></MappedFolders><LogonCommand><Command>powershell -ExecutionPolicy Bypass -File C:\teste\teste.ps1</Command></LogonCommand></Configuration>"
[IO.File]::WriteAllText("$Pasta\hub.wsb", $wsb, (New-Object Text.UTF8Encoding($false)))
Start-Process "$Pasta\hub.wsb"
for ($i = 0; $i -lt 90; $i++) { Start-Sleep 10; if ((Test-Path "$Pasta\resultado.txt") -and (Select-String -Path "$Pasta\resultado.txt" -Pattern '^\S+ fim$' -Quiet)) { break } }
Get-Content "$Pasta\resultado.txt"
