use crate::mouse_trace::{
    anomaly_marker, format_alive_line, format_hid_line, format_page_line, format_timestamp_secs_millis,
    page_left_down,
};
use core_graphics::event::CGMouseButton;
use core_graphics::event_source::CGEventSourceStateID;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

static LOG_MUTEX: Mutex<()> = Mutex::new(());

#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGEventSourceButtonState(
        state: CGEventSourceStateID,
        button: CGMouseButton,
    ) -> bool;
}

fn button_down(state: CGEventSourceStateID, button: CGMouseButton) -> bool {
    unsafe { CGEventSourceButtonState(state, button) }
}

fn log_dir() -> PathBuf {
    dirs::home_dir()
        .map(|home| home.join("Library/Logs/schedule-viewer"))
        .unwrap_or_else(|| PathBuf::from("."))
}

fn timestamp_now() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format_timestamp_secs_millis(now.as_secs(), now.subsec_millis())
}

fn rotate_log() {
    let dir = log_dir();
    let _ = fs::create_dir_all(&dir);
    let path = dir.join("mouse-trace.log");
    if !path.exists() {
        return;
    }
    let backup = dir.join(format!(
        "mouse-trace.{}.log",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0)
    ));
    let _ = fs::rename(path, backup);
}

pub fn append_line(line: &str) {
    let _guard = LOG_MUTEX.lock().expect("mouse trace log");
    let path = log_dir().join("mouse-trace.log");
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{line}");
        let _ = file.flush();
    }
}

pub fn append_page_note(event: &str, detail: Option<&str>) {
    append_line(&format_page_line(&timestamp_now(), event, detail));
}

pub fn spawn_poller() {
    rotate_log();
    append_line(&format_page_line(
        &timestamp_now(),
        "trace_start",
        Some("SV_MOUSE_TRACE=1"),
    ));
    thread::spawn(|| {
        let mut last = (false, false, false, false);
        let mut last_alive = Instant::now();
        let interval = Duration::from_millis(50);
        let alive_every = Duration::from_secs(30);
        loop {
            thread::sleep(interval);
            let hid_left = button_down(CGEventSourceStateID::HIDSystemState, CGMouseButton::Left);
            let hid_right =
                button_down(CGEventSourceStateID::HIDSystemState, CGMouseButton::Right);
            let session_left =
                button_down(CGEventSourceStateID::CombinedSessionState, CGMouseButton::Left);
            let session_right =
                button_down(CGEventSourceStateID::CombinedSessionState, CGMouseButton::Right);
            let page_l = page_left_down();
            let state = (hid_left, hid_right, session_left, session_right);
            if state != last {
                let marker = anomaly_marker(hid_left, page_l);
                append_line(&format_hid_line(
                    &timestamp_now(),
                    hid_left,
                    hid_right,
                    session_left,
                    session_right,
                    page_l,
                    marker,
                ));
                last = state;
            }
            if last_alive.elapsed() >= alive_every {
                let ts = timestamp_now();
                if hid_left && !page_l {
                    append_line(&format_hid_line(
                        &ts,
                        hid_left,
                        hid_right,
                        session_left,
                        session_right,
                        page_l,
                        "!!",
                    ));
                } else {
                    append_line(&format_alive_line(&ts));
                }
                last_alive = Instant::now();
            }
        }
    });
}
