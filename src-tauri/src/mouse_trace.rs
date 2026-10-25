use std::sync::atomic::{AtomicBool, Ordering};

static PAGE_LEFT_DOWN: AtomicBool = AtomicBool::new(false);

pub fn trace_enabled() -> bool {
    std::env::var("SV_MOUSE_TRACE")
        .map(|value| value == "1")
        .unwrap_or(false)
}

pub fn format_timestamp_secs_millis(secs: u64, millis: u32) -> String {
    format!("{}.{:03}", secs, millis)
}

pub fn format_hid_line(
    timestamp: &str,
    hid_left: bool,
    hid_right: bool,
    session_left: bool,
    session_right: bool,
    page_left_down: bool,
    marker: &str,
) -> String {
    format!(
        "{timestamp} hid L={} R={} sess L={} R={} pageL={} {marker}",
        b(hid_left),
        b(hid_right),
        b(session_left),
        b(session_right),
        b(page_left_down),
    )
}

pub fn format_page_line(timestamp: &str, event: &str, detail: Option<&str>) -> String {
    match detail {
        Some(d) if !d.is_empty() => format!("{timestamp} page {event} {d}"),
        _ => format!("{timestamp} page {event}"),
    }
}

pub fn format_alive_line(timestamp: &str) -> String {
    format!("{timestamp} alive")
}

pub fn anomaly_marker(hid_left: bool, page_left_down: bool) -> &'static str {
    if hid_left && !page_left_down {
        "!!"
    } else {
        ""
    }
}

fn b(value: bool) -> char {
    if value {
        '1'
    } else {
        '0'
    }
}

pub fn set_page_left_down(down: bool) {
    PAGE_LEFT_DOWN.store(down, Ordering::SeqCst);
}

pub fn page_left_down() -> bool {
    PAGE_LEFT_DOWN.load(Ordering::SeqCst)
}

pub fn note_page_event(event: &str, detail: Option<&str>) {
    if !trace_enabled() {
        return;
    }
    let primary_button = detail
        .map(|d| d.contains("button=0"))
        .unwrap_or(false);
    match event {
        "pointerdown" if primary_button => set_page_left_down(true),
        "pointerup" | "pointercancel" if primary_button => set_page_left_down(false),
        _ => {}
    }
    #[cfg(target_os = "macos")]
    crate::mouse_trace_mac::append_page_note(event, detail);
}

pub fn spawn_if_enabled() {
    if !trace_enabled() {
        return;
    }
    #[cfg(target_os = "macos")]
    crate::mouse_trace_mac::spawn_poller();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hid_line_includes_anomaly_marker() {
        let line = format_hid_line("1.000", true, false, true, false, false, "!!");
        assert!(line.contains("pageL=0"));
        assert!(line.ends_with(" !!"));
    }

    #[test]
    fn page_line_includes_detail() {
        let line = format_page_line("2.000", "dragstart", Some("CANVAS"));
        assert_eq!(line, "2.000 page dragstart CANVAS");
    }

    #[test]
    fn anomaly_marker_only_when_hid_without_page() {
        assert_eq!(anomaly_marker(true, false), "!!");
        assert_eq!(anomaly_marker(true, true), "");
        assert_eq!(anomaly_marker(false, false), "");
    }
}
