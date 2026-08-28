install:
	adb install -r /home/thinkpad-t480s/CodeArena/App/bible-reader/app-debug.apk

uninstall:
	adb uninstall com.biblereader.app

disconnect:
	adb disconnect