use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    let out = PathBuf::from(env::var("OUT_DIR").unwrap());
    let empty = out.join("empty-payload.bin");
    let _ = fs::write(&empty, []);
    let payload = env::var("VELLUM_PAYLOAD_PATH").unwrap_or_else(|_| empty.display().to_string());
    println!("cargo:rustc-env=VELLUM_PAYLOAD_PATH={payload}");
    println!("cargo:rerun-if-env-changed=VELLUM_PAYLOAD_PATH");
    println!("cargo:rerun-if-changed={payload}");
}
