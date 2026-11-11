use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::Path;
use uuid::Uuid;

pub const OPEN_NEW_WINDOW_TRACE_FILE: &str = "open-new-window-trace.jsonl";
const MAX_TRACE_BYTES: u64 = 256 * 1024;

pub const PHASE_BRIDGE_RECEIVE: &str = "bridge-receive";
pub const PHASE_BRIDGE_EMIT: &str = "bridge-emit";
pub const PHASE_BRIDGE_EMIT_FAILED: &str = "bridge-emit-failed";
pub const PHASE_BRIDGE_EMIT_RETRY: &str = "bridge-emit-retry";
pub const PHASE_BRIDGE_TIMEOUT: &str = "bridge-timeout";
pub const PHASE_BRIDGE_COMPLETE: &str = "bridge-complete";
pub const PHASE_FRONTEND_RECEIVE: &str = "frontend-receive";
pub const PHASE_FRONTEND_DUPLICATE_SKIP: &str = "frontend-duplicate-skip";
pub const PHASE_FRONTEND_EXECUTE_START: &str = "frontend-execute-start";
pub const PHASE_FRONTEND_CREATED: &str = "frontend-created";

const ALLOWED_PHASES: &[&str] = &[
    PHASE_BRIDGE_RECEIVE,
    PHASE_BRIDGE_EMIT,
    PHASE_BRIDGE_EMIT_FAILED,
    PHASE_BRIDGE_EMIT_RETRY,
    PHASE_BRIDGE_TIMEOUT,
    PHASE_BRIDGE_COMPLETE,
    PHASE_FRONTEND_RECEIVE,
    PHASE_FRONTEND_DUPLICATE_SKIP,
    PHASE_FRONTEND_EXECUTE_START,
    PHASE_FRONTEND_CREATED,
];

pub const ORIGIN_BRIDGE: &str = "bridge";
pub const ORIGIN_FRONTEND: &str = "frontend";

const ALLOWED_ORIGINS: &[&str] = &[ORIGIN_BRIDGE, ORIGIN_FRONTEND];

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct OpenNewWindowDiagnosticInput {
    #[serde(rename = "requestId")]
    pub request_id: String,
    pub phase: String,
    pub origin: String,
    #[serde(rename = "windowLabel", default)]
    pub window_label: Option<String>,
    #[serde(rename = "handlerLabel", default)]
    pub handler_label: Option<String>,
    #[serde(default)]
    pub sequence: Option<u8>,
}

#[derive(Serialize)]
struct OpenNewWindowDiagnosticLine<'a> {
    #[serde(rename = "requestId")]
    request_id: &'a str,
    phase: &'a str,
    origin: &'a str,
    #[serde(rename = "windowLabel", skip_serializing_if = "Option::is_none")]
    window_label: Option<&'a str>,
    #[serde(rename = "handlerLabel", skip_serializing_if = "Option::is_none")]
    handler_label: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    sequence: Option<u8>,
}

pub fn validate_request_id(value: &str) -> bool {
    Uuid::parse_str(value).is_ok()
}

pub fn validate_window_label(value: &str) -> bool {
    if value.is_empty() || value.len() > 64 {
        return false;
    }
    value == "main"
        || value
            .strip_prefix("schedule-")
            .and_then(|suffix| suffix.parse::<u32>().ok())
            .is_some()
}

fn validate_phase(value: &str) -> bool {
    ALLOWED_PHASES.contains(&value)
}

fn validate_origin(value: &str) -> bool {
    ALLOWED_ORIGINS.contains(&value)
}

pub fn validate_open_new_window_diagnostic(
    input: &OpenNewWindowDiagnosticInput,
) -> bool {
    if !validate_request_id(&input.request_id) {
        return false;
    }
    if !validate_phase(&input.phase) {
        return false;
    }
    if !validate_origin(&input.origin) {
        return false;
    }
    if let Some(label) = input.window_label.as_deref() {
        if !validate_window_label(label) {
            return false;
        }
    }
    if let Some(label) = input.handler_label.as_deref() {
        if !validate_window_label(label) {
            return false;
        }
    }
    true
}

fn trim_trace_file(path: &Path) {
    let Ok(meta) = fs::metadata(path) else {
        return;
    };
    if meta.len() <= MAX_TRACE_BYTES {
        return;
    }
    let Ok(text) = fs::read_to_string(path) else {
        return;
    };
    let keep_from = text.len().saturating_sub((MAX_TRACE_BYTES / 2) as usize);
    let trimmed = if keep_from == 0 {
        text
    } else {
        let rest = &text[keep_from..];
        rest.split_once('\n')
            .map(|(_, tail)| tail.to_string())
            .unwrap_or_else(|| rest.to_string())
    };
    let _ = fs::write(path, trimmed);
}

pub fn try_append_open_new_window_diagnostic(
    app_data: &Path,
    input: &OpenNewWindowDiagnosticInput,
) {
    if !validate_open_new_window_diagnostic(input) {
        return;
    }
    let _ = try_append_open_new_window_diagnostic_inner(app_data, input);
}

fn try_append_open_new_window_diagnostic_inner(
    app_data: &Path,
    input: &OpenNewWindowDiagnosticInput,
) -> Result<(), ()> {
    fs::create_dir_all(app_data).map_err(|_| ())?;
    let path = app_data.join(OPEN_NEW_WINDOW_TRACE_FILE);
    trim_trace_file(&path);
    let line = OpenNewWindowDiagnosticLine {
        request_id: &input.request_id,
        phase: &input.phase,
        origin: &input.origin,
        window_label: input.window_label.as_deref(),
        handler_label: input.handler_label.as_deref(),
        sequence: input.sequence,
    };
    let mut text = serde_json::to_string(&line).map_err(|_| ())?;
    text.push('\n');
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|_| ())?;
    file.write_all(text.as_bytes()).map_err(|_| ())?;
    Ok(())
}

pub fn created_label_from_mcp_success_body(text: &str) -> Option<String> {
    let trimmed = text.trim();
    if validate_window_label(trimmed) {
        Some(trimmed.to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TRACE_COUNTER: AtomicU64 = AtomicU64::new(0);

    fn temp_app_data() -> std::path::PathBuf {
        let n = TRACE_COUNTER.fetch_add(1, Ordering::Relaxed);
        std::env::temp_dir().join(format!("sv-onw-trace-test-{n}"))
    }

    fn sample_input(phase: &str) -> OpenNewWindowDiagnosticInput {
        OpenNewWindowDiagnosticInput {
            request_id: Uuid::new_v4().to_string(),
            phase: phase.to_string(),
            origin: ORIGIN_BRIDGE.to_string(),
            window_label: Some("schedule-2".to_string()),
            handler_label: Some("main".to_string()),
            sequence: None,
        }
    }

    #[test]
    fn rejects_arbitrary_phase_and_preserves_label_validation() {
        let mut input = sample_input("mystery-phase");
        assert!(!validate_open_new_window_diagnostic(&input));
        input.phase = PHASE_BRIDGE_RECEIVE.to_string();
        assert!(validate_open_new_window_diagnostic(&input));
        input.window_label = Some("/etc/passwd".to_string());
        assert!(!validate_open_new_window_diagnostic(&input));
    }

    #[test]
    fn append_and_read_trace_line() {
        let app_data = temp_app_data();
        let _ = fs::remove_dir_all(&app_data);
        let input = sample_input(PHASE_BRIDGE_RECEIVE);
        try_append_open_new_window_diagnostic(&app_data, &input);
        let text = fs::read_to_string(app_data.join(OPEN_NEW_WINDOW_TRACE_FILE)).unwrap();
        let row: serde_json::Value = serde_json::from_str(text.lines().next().unwrap()).unwrap();
        assert_eq!(row["requestId"], input.request_id);
        assert_eq!(row["phase"], PHASE_BRIDGE_RECEIVE);
        assert_eq!(row["windowLabel"], "schedule-2");
        assert!(row.get("path").is_none());
        let _ = fs::remove_dir_all(&app_data);
    }

    #[test]
    fn logging_failure_does_not_panic_on_bad_origin() {
        let app_data = temp_app_data();
        let _ = fs::remove_dir_all(&app_data);
        let input = OpenNewWindowDiagnosticInput {
            request_id: Uuid::new_v4().to_string(),
            phase: PHASE_BRIDGE_RECEIVE.to_string(),
            origin: "telemetry".to_string(),
            window_label: None,
            handler_label: None,
            sequence: None,
        };
        try_append_open_new_window_diagnostic(&app_data, &input);
        assert!(!app_data.join(OPEN_NEW_WINDOW_TRACE_FILE).exists());
        let _ = fs::remove_dir_all(&app_data);
    }
}
