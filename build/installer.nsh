; Re-apply shortcuts with bundled icon.ico after every install/update.
; Default NSIS shortcuts use $appExe as icon; on updates keepShortcuts often
; skips recreation, so Windows keeps the old Electron logo on taskbar pins.

!macro refreshLandevShortcuts
  StrCpy $R9 "$INSTDIR\resources\icon.ico"
  ${IfNot} ${FileExists} "$R9"
    StrCpy $R9 "$appExe"
  ${EndIf}

  ${If} ${FileExists} "$newStartMenuLink"
    CreateShortCut "$newStartMenuLink" "$appExe" "" "$R9" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
  ${EndIf}

  ${IfNot} ${isNoDesktopShortcut}
    ${If} ${FileExists} "$newDesktopLink"
      CreateShortCut "$newDesktopLink" "$appExe" "" "$R9" 0 "" "" "${APP_DESCRIPTION}"
      ClearErrors
      WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
    ${EndIf}
  ${EndIf}

  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend

!macro customInstall
  !insertmacro refreshLandevShortcuts
!macroend
