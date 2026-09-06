' Pizza Hub — konsol oynasisiz ishga tushirish.
' Windows login qilganda Startup papkasidan shu fayl chaqiriladi.

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")

' scripts/ papkasidan bitta yuqoriga — loyiha ildizi
projectDir = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))

sh.CurrentDirectory = projectDir
' 0 = oyna ko'rinmaydi, False = kutmaydi
sh.Run "cmd /c node """ & projectDir & "\start.js""", 0, False
