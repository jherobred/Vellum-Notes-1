#![cfg_attr(windows, windows_subsystem = "windows")]

const PAYLOAD: &[u8] = include_bytes!(env!("VELLUM_PAYLOAD_PATH"));

fn main() {
    #[cfg(windows)]
    {
        if let Err(err) = install() {
            tell(&err, false);
            std::process::exit(1);
        }
    }
    #[cfg(not(windows))]
    {
        eprintln!("The Vellum installer is built for Windows.");
        std::process::exit(1);
    }
}

#[cfg(windows)]
fn install() -> Result<(), String> {
    if PAYLOAD.is_empty() {
        return Err("This installer was built without the Vellum app inside.".into());
    }
    let base = std::env::var_os("LOCALAPPDATA")
        .map(std::path::PathBuf::from)
        .ok_or_else(|| "LOCALAPPDATA is not set.".to_string())?
        .join("Vellum");
    std::fs::create_dir_all(&base).map_err(|err| format!("Could not create the Vellum folder: {err}"))?;
    let exe = base.join("Vellum.exe");
    std::fs::write(&exe, PAYLOAD).map_err(|err| format!("Could not write Vellum.exe: {err}"))?;

    let uninstall = r#"Remove-Item -LiteralPath "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Vellum.lnk" -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$env:LOCALAPPDATA\Vellum" -Recurse -Force -ErrorAction SilentlyContinue
"#;
    std::fs::write(base.join("Uninstall.ps1"), uninstall).ok();

    let shortcut = shortcut_script(&exe);
    let status = std::process::Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &shortcut])
        .status()
        .map_err(|err| format!("Could not create the Start menu shortcut: {err}"))?;
    if !status.success() {
        return Err("Could not create the Start menu shortcut.".into());
    }

    std::process::Command::new(&exe)
        .spawn()
        .map_err(|err| format!("Vellum is installed, but it did not open: {err}"))?;
    tell("Vellum is installed for your user, with a Start menu shortcut. No admin needed.", true);
    Ok(())
}

#[cfg(windows)]
fn shortcut_script(exe: &std::path::Path) -> String {
    let target = exe.display().to_string().replace('\'', "''");
    let work = exe
        .parent()
        .unwrap_or(exe)
        .display()
        .to_string()
        .replace('\'', "''");
    format!(
        "$shell = New-Object -ComObject WScript.Shell; \
         $link = $shell.CreateShortcut(\"$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Vellum.lnk\"); \
         $link.TargetPath = '{target}'; \
         $link.WorkingDirectory = '{work}'; \
         $link.Description = 'Vellum'; \
         $link.Save()"
    )
}

#[cfg(windows)]
fn tell(message: &str, ok: bool) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    let wide = |text: &str| -> Vec<u16> { OsStr::new(text).encode_wide().chain(std::iter::once(0)).collect() };
    let text = wide(message);
    let title = wide("Vellum");
    #[link(name = "user32")]
    extern "system" {
        fn MessageBoxW(hwnd: isize, text: *const u16, caption: *const u16, flags: u32) -> i32;
    }
    let flags = if ok { 0x40 } else { 0x10 };
    unsafe {
        MessageBoxW(0, text.as_ptr(), title.as_ptr(), flags);
    }
}
