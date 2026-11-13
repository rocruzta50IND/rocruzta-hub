# Lista as janelas de nível superior visíveis de um processo (e quem é o dono de cada uma). Uso: -ProcessId <pid> [-Fechar <hwnd>]
# Serve para provar que um diálogo do Windows está PRESO à janela do Hub (dono = janela principal) e para fechá-lo no teste.
param([int]$ProcessId, [Int64]$Fechar = 0)
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class J {
  delegate bool Cb(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(Cb cb, IntPtr l);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  public static string Listar(uint pid) {
    var linhas = new List<string>();
    EnumWindows((h, l) => {
      uint p; GetWindowThreadProcessId(h, out p);
      if (p != pid || !IsWindowVisible(h)) return true;
      var t = new StringBuilder(256); GetWindowText(h, t, 256);
      var c = new StringBuilder(256); GetClassName(h, c, 256);
      var dono = GetWindow(h, 4);
      linhas.Add(h.ToInt64() + "|" + dono.ToInt64() + "|" + c + "|" + t);
      return true;
    }, IntPtr.Zero);
    return string.Join("\n", linhas);
  }
  public static void Fechar(long h) { PostMessage(new IntPtr(h), 0x0010, IntPtr.Zero, IntPtr.Zero); }
}
'@
if ($Fechar -ne 0) { [J]::Fechar($Fechar); return }
[J]::Listar([uint32]$ProcessId)
