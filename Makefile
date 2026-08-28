install:
	adb install -r /home/thinkpad-t480s/CodeArena/App/local_note/android/app/build/outputs/apk/debug/app-debug.apk

uninstall:
	adb uninstall com.localnote.app

disconnect:
	adb disconnect
  
build_app:
	npm run build
	npx cap sync

show_logs:
	adb logcat