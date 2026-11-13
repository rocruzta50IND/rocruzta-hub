# Troca os arquivos do Hub pela versão nova já preparada (adaptado do apply-update.ps1 do Termix; ver docs/DECISOES.md §20).
# O Hub extrai o instalador numa pasta de preparo (dentro da pasta instalada, no mesmo disco) enquanto está aberto. Quando ele
# fecha, este script (lançado pelo Hub, a partir de uma cópia em %TEMP%) troca os arquivos por renomeação, que é instantânea,
# e, se pedido, abre o Hub de novo. Se a renomeação falhar, copia por cima (robocopy). Nunca apaga nada além das próprias sobras.
param(
  [int]$ParentPid,
  [string]$Src,
  [string]$Dst,
  [string]$Exe = 'Rocruzta Hub.exe',
  [int]$Restart = 0,
  [int]$KeepExe = 0,
  [string]$Log = ''
)
$ErrorActionPreference = 'Stop'
function Log($m) { if ($Log) { try { Add-Content -LiteralPath $Log -Value ("{0:HH:mm:ss.fff} {1}" -f (Get-Date), $m) -Encoding UTF8 } catch {} } }

Log "inicio: pid=$ParentPid src=$Src dst=$Dst exe=$Exe restart=$Restart keepexe=$KeepExe"
try { if ($ParentPid -gt 0) { Wait-Process -Id $ParentPid -Timeout 60 -ErrorAction SilentlyContinue } } catch {}
Log "app encerrado"

# sobras do Hub (processos filhos) ainda usando arquivos da pasta instalada
$dstFull = [IO.Path]::GetFullPath($Dst).TrimEnd('\') + '\'
try {
  Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($dstFull, [StringComparison]::OrdinalIgnoreCase) } |
    ForEach-Object { Log ("encerrando sobra: " + $_.Id); Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
} catch {}

$ok = $false
$old = Join-Path $Dst '.old'
$complete = (Test-Path -LiteralPath (Join-Path $Src $Exe)) -and (Test-Path -LiteralPath (Join-Path $Src 'resources\app.asar'))
if (-not $complete) { Log "pasta de preparo incompleta: nada foi trocado" }
else {
  $srcFull = [IO.Path]::GetFullPath($Src)
  if ($srcFull.StartsWith($dstFull, [StringComparison]::OrdinalIgnoreCase)) {
    # caminho rápido: renomeia cada item de nível superior (o antigo vai para .old, o novo entra no lugar)
    try {
      if (Test-Path -LiteralPath $old) { Remove-Item -LiteralPath $old -Recurse -Force -ErrorAction SilentlyContinue }
      New-Item -ItemType Directory -Path $old -Force | Out-Null
      $moved = @()
      try {
        foreach ($e in Get-ChildItem -LiteralPath $Src -Force) {
          if ($KeepExe -eq 1 -and $e.Name -ieq $Exe) { continue } # mesmo motor: o .exe instalado (já liberado pelo Windows) não é trocado
          $t = Join-Path $Dst $e.Name
          if (Test-Path -LiteralPath $t) { Move-Item -LiteralPath $t -Destination (Join-Path $old $e.Name) -Force; $moved += $e.Name }
          Move-Item -LiteralPath $e.FullName -Destination $t -Force
        }
        $ok = $true
        Log "troca por renomeação concluída"
      } catch {
        Log ("renomeação falhou (" + $_.Exception.Message + "): desfazendo")
        foreach ($n in $moved) {
          try {
            $t = Join-Path $Dst $n
            if (Test-Path -LiteralPath $t) { Move-Item -LiteralPath $t -Destination (Join-Path $Src $n) -Force } # o novo volta para a pasta de preparo (a cópia de reserva precisa dele inteiro)
            Move-Item -LiteralPath (Join-Path $old $n) -Destination $t -Force
          } catch { Log ("não consegui desfazer " + $n) }
        }
      }
    } catch { Log ("preparo da renomeação falhou: " + $_.Exception.Message) }
  }
  if (-not $ok) {
    # caminho de reserva: copia por cima (não apaga nada da pasta instalada)
    $xf = @(); if ($KeepExe -eq 1) { $xf = @('/XF', $Exe) }
    & robocopy.exe $Src $Dst /E /IS /IT /R:10 /W:2 /NFL /NDL /NJH /NJS /NP @xf | Out-Null
    $code = $LASTEXITCODE
    Log "robocopy saiu com $code"
    if ($code -lt 8) { $ok = $true }
  }
}

if ($Restart -eq 1) {
  Log "abrindo o Hub"
  Start-Process -FilePath (Join-Path $Dst $Exe)
  Log "Hub aberto"
}
if ($ok) {
  # limpeza depois de o app já estar de pé: sobras da versão antiga e a pasta de preparo
  try { Remove-Item -LiteralPath (Join-Path (Split-Path $Src -Parent) 'staged.json') -Force -ErrorAction SilentlyContinue } catch {}
  try { Remove-Item -LiteralPath $old -Recurse -Force -ErrorAction SilentlyContinue } catch {}
  try { Remove-Item -LiteralPath $Src -Recurse -Force -ErrorAction SilentlyContinue } catch {}
  Log "limpeza concluida"
}
