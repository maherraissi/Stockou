; Custom NSIS script - Close Stockou before install
!macro customInstall
  ; Try to close any running instance of Stockou gracefully
  DetailPrint "Fermeture de Stockou en cours..."
  nsExec::ExecToLog '"$INSTDIR\Stockou.exe" --quit'
  Sleep 2000
  ; Force kill if still running
  nsExec::ExecToLog 'taskkill /F /IM Stockou.exe'
  Sleep 1000
!macroend

!macro customUnInstall
  ; Kill the app if running during uninstall
  nsExec::ExecToLog 'taskkill /F /IM Stockou.exe'
  Sleep 1000
!macroend
