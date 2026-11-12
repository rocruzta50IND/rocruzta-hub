# Injeta teclas REAIS (keybd_event) na janela em primeiro plano, só se ela for a janela do Hub passada em -Hwnd.
# Usado por tools/medir-troca-real.js. Sequência em -Passos: D<vk> (tecla desce), U<vk> (sobe), W<ms> (espera), separados por vírgula.
# Imprime "<passo> <epoch ms>" para cada tecla enviada. Aborta sem enviar nada se o Hub não estiver em primeiro plano.
param([Parameter(Mandatory)][string]$Hwnd, [Parameter(Mandatory)][string]$Passos, [switch]$Trazer)
Add-Type -Namespace T -Name K -MemberDefinition @'
[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, System.UIntPtr extra);
[DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr h);
[DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr h, int c);
'@
$h = [System.IntPtr][long]$Hwnd
if ($Trazer) {
  [void][T.K]::ShowWindow($h, 9)
  [T.K]::keybd_event(0x12, 0, 0, [System.UIntPtr]::Zero); [T.K]::keybd_event(0x12, 0, 2, [System.UIntPtr]::Zero) # truque do Alt para liberar o primeiro plano
  [void][T.K]::SetForegroundWindow($h)
  Start-Sleep -Milliseconds 400
}
if ([T.K]::GetForegroundWindow() -ne $h) { Write-Output 'ABORTADO: o Hub nao esta em primeiro plano'; exit 3 }
$scan = @{ 17 = 0x1D; 32 = 0x39 }
foreach ($p in $Passos.Split(',')) {
  $tipo = $p.Substring(0, 1); $n = [int]$p.Substring(1)
  if ($tipo -eq 'W') { Start-Sleep -Milliseconds $n; continue }
  $agora = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  [T.K]::keybd_event([byte]$n, [byte]$scan[$n], $(if ($tipo -eq 'U') { 2 } else { 0 }), [System.UIntPtr]::Zero)
  Write-Output "$p $agora"
}
