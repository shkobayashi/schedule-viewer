use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const DIAG_FILE: &str = "window-diag.log";
const MAX_DIAG_BYTES: usize = 64 * 1024;
const TRIM_KEEP_BYTES: usize = 32 * 1024;

static DIAG_MUTEX: Mutex<()> = Mutex::new(());

fn trim_diag_file(path: &Path) {
    if let Ok(meta) = fs::metadata(path) {
        let len = meta.len() as usize;
        if len <= MAX_DIAG_BYTES {
            return;
        }
        if let Ok(bytes) = fs::read(path) {
            let start = len.saturating_sub(TRIM_KEEP_BYTES);
            let _ = fs::write(path, &bytes[start..]);
        }
    }
}

pub fn window_diag_log(app_data: &Path, line: &str) {
    let _guard = DIAG_MUTEX.lock().expect("window diag");
    let _ = fs::create_dir_all(app_data);
    let path = app_data.join(DIAG_FILE);
    trim_diag_file(&path);
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let mut file = match OpenOptions::new().create(true).append(true).open(&path) {
        Ok(value) => value,
        Err(_) => return,
    };
    let _ = writeln!(file, "{} {}", secs, line);
    let _ = file.flush();
}
