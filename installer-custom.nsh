; Custom NSIS installer script for Gym Management System
; Professional Arabic RTL installer

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

; Installer settings
!define MUI_ICON "build-resources\icon.ico"
!define MUI_UNICON "build-resources\icon.ico"

; Custom installer graphics
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "build-resources\installer-header.bmp"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_WELCOMEFINISHPAGE_BITMAP "build-resources\installer-sidebar.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "build-resources\installer-sidebar.bmp"

; RTL support
!define MUI_LANGDLL_ALLLANGUAGES

; Custom welcome page
!define MUI_WELCOMEPAGE_TITLE "مرحباً بك في معالج تثبيت نظام إدارة النادي الرياضي"
!define MUI_WELCOMEPAGE_TEXT "هذا المعالج سيقوم بإرشادك خلال عملية تثبيت نظام إدارة النادي الرياضي - GYM DADA.$\r$\n$\r$\nيُنصح بإغلاق جميع التطبيقات الأخرى قبل المتابعة. هذا سيمكن المثبت من تحديث ملفات النظام ذات الصلة دون الحاجة لإعادة تشغيل الكمبيوتر.$\r$\n$\r$\nانقر التالي للمتابعة."

; License page
!define MUI_LICENSEPAGE_TEXT_TOP "يرجى مراجعة اتفاقية الترخيص التالية. يجب قبول شروط هذه الاتفاقية قبل المتابعة مع التثبيت."
!define MUI_LICENSEPAGE_TEXT_BOTTOM "إذا كنت توافق على جميع شروط الاتفاقية، انقر أوافق للمتابعة. يجب أن توافق على الاتفاقية لتثبيت نظام إدارة النادي الرياضي."
!define MUI_LICENSEPAGE_BUTTON "&أوافق"

; Directory page
!define MUI_DIRECTORYPAGE_TEXT_TOP "سيقوم المثبت بتثبيت نظام إدارة النادي الرياضي في المجلد التالي. لتثبيت في مجلد مختلف، انقر استعراض واختر مجلد آخر. انقر التالي للمتابعة."

; Installation page
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "اكتمل التثبيت"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "تم تثبيت نظام إدارة النادي الرياضي بنجاح."

; Finish page
!define MUI_FINISHPAGE_TITLE "اكتمل تثبيت نظام إدارة النادي الرياضي"
!define MUI_FINISHPAGE_TEXT "تم تثبيت نظام إدارة النادي الرياضي على جهاز الكمبيوتر الخاص بك.$\r$\n$\r$\nانقر إنهاء لإغلاق هذا المعالج."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_NAME}.exe"
!define MUI_FINISHPAGE_RUN_TEXT "تشغيل نظام إدارة النادي الرياضي"
!define MUI_FINISHPAGE_LINK "زيارة موقع الدعم الفني"
!define MUI_FINISHPAGE_LINK_LOCATION "https://support.gym-dada.com"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "Arabic"

; Custom functions
Function .onInit
  ; Check if application is already running
  System::Call 'kernel32::CreateMutexA(i 0, i 0, t "GymDadaInstaller") i .r1 ?e'
  Pop $R0
  StrCmp $R0 0 +3
    MessageBox MB_OK|MB_ICONEXCLAMATION "المثبت يعمل بالفعل."
    Abort

  ; Check Windows version
  ${IfNot} ${AtLeastWin7}
    MessageBox MB_OK|MB_ICONSTOP "هذا البرنامج يتطلب Windows 7 أو أحدث."
    Abort
  ${EndIf}
FunctionEnd

; Installation section
Section "الملفات الأساسية" SecMain
  SectionIn RO
  
  SetOutPath "$INSTDIR"
  
  ; Add all application files
  File /r "${BUILD_RESOURCES_DIR}\*.*"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\نظام إدارة النادي الرياضي"
  CreateShortCut "$SMPROGRAMS\نظام إدارة النادي الرياضي\نظام إدارة النادي الرياضي.lnk" "$INSTDIR\${PRODUCT_NAME}.exe" "" "$INSTDIR\${PRODUCT_NAME}.exe" 0
  CreateShortCut "$SMPROGRAMS\نظام إدارة النادي الرياضي\إلغاء التثبيت.lnk" "$INSTDIR\Uninstall.exe"
  
  ; Desktop shortcut
  CreateShortCut "$DESKTOP\نظام إدارة النادي الرياضي.lnk" "$INSTDIR\${PRODUCT_NAME}.exe" "" "$INSTDIR\${PRODUCT_NAME}.exe" 0
  
  ; Write registry keys
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GymDada" "DisplayName" "نظام إدارة النادي الرياضي - GYM DADA"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GymDada" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GymDada" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GymDada" "DisplayIcon" "$INSTDIR\${PRODUCT_NAME}.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GymDada" "Publisher" "GYM DADA Systems"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GymDada" "DisplayVersion" "${VERSION}"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GymDada" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GymDada" "NoRepair" 1
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

; Uninstaller section
Section "Uninstall"
  ; Remove files
  RMDir /r "$INSTDIR"
  
  ; Remove shortcuts
  RMDir /r "$SMPROGRAMS\نظام إدارة النادي الرياضي"
  Delete "$DESKTOP\نظام إدارة النادي الرياضي.lnk"
  
  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GymDada"
SectionEnd