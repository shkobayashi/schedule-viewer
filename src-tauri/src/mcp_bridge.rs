use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Condvar, Mutex};
use std::time::{Duration, Instant};
#[cfg(unix)]
use std::{fs, thread};
use tauri::{AppHandle, Emitter, EventTarget, Manager, WebviewWindow};
use uuid::Uuid;

#[cfg(unix)]
use crate::mcp_app_data::mcp_socket_path;
use crate::window_session::{
    read_open_windows, resolve_mcp_screen_window_label, WindowSessionState,
};

#[cfg(windows)]
#[path = "mcp_bridge_windows.rs"]
mod mcp_bridge_windows;

pub(crate) const BRIDGE_VERSION: u32 = 1;
pub(crate) const MCP_PIPE_CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
const RESPONSE_TIMEOUT: Duration = MCP_PIPE_CONNECT_TIMEOUT;

const MSG_NO_GUI: &str = "スケジュールのウィンドウが開いていないので、渡せません。";
const MSG_NO_WINDOW: &str = "前面のウィンドウが開いていないので、渡せません。";
const MSG_STALE: &str = "前面のウィンドウが応答しなかったので、渡せません。";

#[derive(Debug)]
pub enum McpBridgeError {
    NoGui,
    NoWindow,
    Stale,
    Io(()),
}

impl McpBridgeError {
    pub fn user_message(&self) -> String {
        match self {
            McpBridgeError::NoGui => MSG_NO_GUI.to_string(),
            McpBridgeError::NoWindow => MSG_NO_WINDOW.to_string(),
            McpBridgeError::Stale => MSG_STALE.to_string(),
            McpBridgeError::Io(_) => MSG_NO_GUI.to_string(),
        }
    }
}

#[derive(Serialize, Deserialize)]
pub(crate) struct BridgeRequest {
    pub v: u32,
    pub id: String,
    pub tool: String,
    pub arguments: Value,
}

#[derive(Clone, Serialize, Deserialize)]
pub(crate) struct BridgeResponse {
    pub v: u32,
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

struct PendingReply {
    window_label: String,
    generation: u64,
    notify: Arc<(Mutex<bool>, Condvar)>,
    result: Arc<Mutex<Option<BridgeResponse>>>,
}

pub struct McpBridgeState {
    app_data: PathBuf,
    generations: Mutex<HashMap<String, u64>>,
    pending: Mutex<HashMap<String, PendingReply>>,
}

impl McpBridgeState {
    pub fn new(app_data: PathBuf) -> Self {
        Self {
            app_data,
            generations: Mutex::new(HashMap::new()),
            pending: Mutex::new(HashMap::new()),
        }
    }

    pub fn bump_generation(&self, label: &str) {
        let mut gens = self.generations.lock().expect("mcp generations");
        let next = gens.get(label).copied().unwrap_or(0) + 1;
        gens.insert(label.to_string(), next);
        let mut pending = self.pending.lock().expect("mcp pending");
        let ids: Vec<String> = pending
            .iter()
            .filter(|(_, entry)| entry.window_label == label)
            .map(|(id, _)| id.clone())
            .collect();
        for id in ids {
            if let Some(entry) = pending.remove(&id) {
                {
                    let mut slot = entry.result.lock().expect("mcp result");
                    *slot = Some(BridgeResponse {
                        v: BRIDGE_VERSION,
                        id: id.clone(),
                        body: None,
                        error: Some("stale".to_string()),
                    });
                }
                let (lock, cvar) = &*entry.notify;
                let mut done = lock.lock().expect("mcp notify");
                *done = true;
                cvar.notify_one();
            }
        }
    }

    pub fn generation_for(&self, label: &str) -> u64 {
        self.generations
            .lock()
            .expect("mcp generations")
            .get(label)
            .copied()
            .unwrap_or(0)
    }
}

pub fn start_mcp_bridge_server(
    app: AppHandle,
    state: Arc<McpBridgeState>,
) -> Result<(), String> {
    #[cfg(unix)]
    {
        start_mcp_bridge_server_unix(app, state)
    }
    #[cfg(windows)]
    {
        mcp_bridge_windows::start_mcp_bridge_server(app, state)
    }
    #[cfg(not(any(unix, windows)))]
    {
        let _ = (app, state);
        Err("この OS では MCP のローカル連携は未対応です。".to_string())
    }
}

#[cfg(unix)]
fn start_mcp_bridge_server_unix(
    app: AppHandle,
    state: Arc<McpBridgeState>,
) -> Result<(), String> {
    let socket_path = mcp_socket_path(&state.app_data);
    if socket_path.exists() && can_connect_to_unix_socket(&socket_path) {
        return Ok(());
    }
    prepare_socket_file(&socket_path)?;
    let listener = bind_unix_listener(&socket_path)?;
    thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            if !peer_is_same_user(&stream) {
                continue;
            }
            let mut stream = stream;
            let _ = handle_bridge_connection_io(&app, &state, &mut stream);
        }
    });
    Ok(())
}

#[cfg(unix)]
fn prepare_socket_file(socket_path: &Path) -> Result<(), String> {
    if !socket_path.exists() {
        return Ok(());
    }
    fs::remove_file(socket_path).map_err(|e| format!("MCP ソケットを消せません: {}", e))?;
    Ok(())
}

#[cfg(unix)]
fn can_connect_to_unix_socket(socket_path: &Path) -> bool {
    use std::os::unix::net::UnixStream;
    UnixStream::connect(socket_path).is_ok()
}

#[cfg(unix)]
fn bind_unix_listener(
    socket_path: &Path,
) -> Result<std::os::unix::net::UnixListener, String> {
    use std::os::unix::net::UnixListener;
    if let Some(parent) = socket_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("アプリデータを準備できません: {}", e))?;
    }
    let listener = UnixListener::bind(socket_path)
        .map_err(|e| format!("MCP ソケットを開けません: {}", e))?;
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(socket_path, fs::Permissions::from_mode(0o600))
        .map_err(|e| format!("MCP ソケットの権限を設定できません: {}", e))?;
    Ok(listener)
}

#[cfg(unix)]
fn peer_is_same_user(stream: &std::os::unix::net::UnixStream) -> bool {
    use std::os::unix::io::AsRawFd;
    let fd = stream.as_raw_fd();
    let cred = peer_credentials(fd);
    cred.map(|(uid, _)| uid == current_uid()).unwrap_or(false)
}

#[cfg(target_os = "linux")]
fn peer_credentials(fd: i32) -> Option<(u32, u32)> {
    use std::mem::MaybeUninit;
    use std::os::raw::c_int;
    const SO_PEERCRED: c_int = 17;
    let mut cred = MaybeUninit::<libc::ucred>::uninit();
    let mut len = std::mem::size_of::<libc::ucred>() as u32;
    let rc = unsafe {
        libc::getsockopt(
            fd,
            libc::SOL_SOCKET,
            SO_PEERCRED,
            cred.as_mut_ptr() as *mut libc::c_void,
            &mut len as *mut u32,
        )
    };
    if rc != 0 {
        return None;
    }
    let cred = unsafe { cred.assume_init() };
    Some((cred.uid, cred.gid))
}

#[cfg(target_os = "macos")]
fn peer_credentials(fd: i32) -> Option<(u32, u32)> {
    let mut uid: u32 = 0;
    let mut gid: u32 = 0;
    let rc = unsafe { libc::getpeereid(fd, &mut uid as *mut u32, &mut gid as *mut u32) };
    if rc != 0 {
        return None;
    }
    Some((uid, gid))
}

#[cfg(all(unix, not(any(target_os = "linux", target_os = "macos"))))]
fn peer_credentials(_fd: i32) -> Option<(u32, u32)> {
    None
}

#[cfg(unix)]
fn current_uid() -> u32 {
    unsafe { libc::getuid() as u32 }
}

pub(crate) fn handle_bridge_connection_io<R: Read + Write>(
    app: &AppHandle,
    state: &Arc<McpBridgeState>,
    stream: &mut R,
) -> Result<(), String> {
    let request: BridgeRequest = match read_frame(stream) {
        Ok(value) => value,
        Err(_) => return Ok(()),
    };
    let response = dispatch_to_front_window(app, state, request)?;
    write_frame(stream, &response)?;
    Ok(())
}

fn dispatch_to_front_window(
    app: &AppHandle,
    state: &Arc<McpBridgeState>,
    request: BridgeRequest,
) -> Result<BridgeResponse, String> {
    let recorded_focused = read_open_windows(&state.app_data)
        .map(|file| file.focused_label)
        .unwrap_or_else(|_| "main".to_string());
    let live_labels: Vec<String> = app.webview_windows().keys().cloned().collect();
    let focus_order = app
        .try_state::<Mutex<WindowSessionState>>()
        .map(|session| session.lock().expect("window session").focus_order.clone())
        .unwrap_or_default();
    let os_focused = app
        .webview_windows()
        .iter()
        .find_map(|(label, webview)| {
            webview
                .is_focused()
                .ok()
                .filter(|focused| *focused)
                .map(|_| label.clone())
        });
    let target_label = resolve_mcp_screen_window_label(
        &recorded_focused,
        &live_labels,
        &focus_order,
        os_focused.as_deref(),
    );
    let window = match target_label.and_then(|label| app.get_webview_window(&label)) {
        Some(w) => w,
        None => {
            return Ok(BridgeResponse {
                v: BRIDGE_VERSION,
                id: request.id,
                body: None,
                error: Some("no-window".to_string()),
            });
        }
    };
    let label = window.label().to_string();
    let generation = state.generation_for(&label);
    let notify = Arc::new((Mutex::new(false), Condvar::new()));
    let result_slot = Arc::new(Mutex::new(None));
    {
        let mut pending = state.pending.lock().expect("mcp pending");
        pending.insert(
            request.id.clone(),
            PendingReply {
                window_label: label.clone(),
                generation,
                notify: notify.clone(),
                result: result_slot.clone(),
            },
        );
    }
    let payload = json!({
        "id": request.id,
        "generation": generation,
        "tool": request.tool,
        "arguments": request.arguments,
    });
    if window
        .emit_to(
            EventTarget::webview_window(label.clone()),
            "mcp-screen-request",
            payload,
        )
        .is_err()
    {
        state.pending.lock().expect("mcp pending").remove(&request.id);
        return Ok(BridgeResponse {
            v: BRIDGE_VERSION,
            id: request.id,
            body: None,
            error: Some("no-window".to_string()),
        });
    }
    let (lock, cvar) = &*notify;
    let mut done = lock.lock().expect("mcp notify");
    let deadline = Instant::now() + RESPONSE_TIMEOUT;
    while !*done {
        let wait = cvar
            .wait_timeout(done, RESPONSE_TIMEOUT)
            .expect("mcp wait");
        done = wait.0;
        if *done {
            break;
        }
        if Instant::now() >= deadline {
            break;
        }
    }
    let stored = result_slot.lock().expect("mcp result").clone();
    if let Some(response) = stored {
        return Ok(response);
    }
    state.pending.lock().expect("mcp pending").remove(&request.id);
    Ok(BridgeResponse {
        v: BRIDGE_VERSION,
        id: request.id,
        body: None,
        error: Some("stale".to_string()),
    })
}

fn take_pending_reply_for_window(
    pending: &mut HashMap<String, PendingReply>,
    id: &str,
    reply_label: &str,
) -> Option<PendingReply> {
    let matches = pending
        .get(id)
        .is_some_and(|entry| entry.window_label == reply_label);
    if matches {
        pending.remove(id)
    } else {
        None
    }
}

#[tauri::command]
pub fn mcp_reply(
    id: String,
    generation: u64,
    body: Value,
    window: WebviewWindow,
    state: tauri::State<'_, Arc<McpBridgeState>>,
) -> Result<(), String> {
    let label = window.label().to_string();
    if state.generation_for(&label) != generation {
        return Ok(());
    }
    let entry = {
        let mut pending = state.pending.lock().expect("mcp pending");
        take_pending_reply_for_window(&mut pending, &id, &label)
    };
    if let Some(entry) = entry {
        if entry.generation != generation {
            return Ok(());
        }
        let response = BridgeResponse {
            v: BRIDGE_VERSION,
            id: id.clone(),
            body: Some(body),
            error: None,
        };
        {
            let mut slot = entry.result.lock().expect("mcp result");
            *slot = Some(response);
        }
        let (lock, cvar) = &*entry.notify;
        let mut done = lock.lock().expect("mcp notify");
        *done = true;
        cvar.notify_one();
    }
    Ok(())
}

pub fn call_tool_via_bridge(tool: &str, arguments: Value) -> Result<Value, McpBridgeError> {
    #[cfg(unix)]
    {
        let app_data = crate::mcp_app_data::app_data_dir_without_tauri()
            .ok_or(McpBridgeError::NoGui)?;
        let socket_path = mcp_socket_path(&app_data);
        use std::os::unix::net::UnixStream;
        let mut stream =
            UnixStream::connect(&socket_path).map_err(|_| McpBridgeError::NoGui)?;
        bridge_exchange(&mut stream, tool, arguments)
    }
    #[cfg(windows)]
    {
        mcp_bridge_windows::call_tool_via_bridge(tool, arguments)
    }
    #[cfg(not(any(unix, windows)))]
    {
        let _ = (tool, arguments);
        Err(McpBridgeError::NoGui)
    }
}

pub(crate) fn bridge_exchange<R: Read + Write>(
    stream: &mut R,
    tool: &str,
    arguments: Value,
) -> Result<Value, McpBridgeError> {
    let request = BridgeRequest {
        v: BRIDGE_VERSION,
        id: Uuid::new_v4().to_string(),
        tool: tool.to_string(),
        arguments,
    };
    if write_frame(stream, &request).is_err() {
        return Err(McpBridgeError::NoGui);
    }
    let response: BridgeResponse = read_frame(stream).map_err(|_| McpBridgeError::Io(()))?;
    if let Some(error) = response.error {
        return Err(map_bridge_error(&error));
    }
    response.body.ok_or(McpBridgeError::Stale)
}

fn map_bridge_error(code: &str) -> McpBridgeError {
    match code {
        "no-window" => McpBridgeError::NoWindow,
        "stale" => McpBridgeError::Stale,
        _ => McpBridgeError::Stale,
    }
}

pub(crate) fn read_frame<T: for<'de> Deserialize<'de>, R: Read>(reader: &mut R) -> Result<T, String> {
    let mut len_buf = [0u8; 4];
    reader
        .read_exact(&mut len_buf)
        .map_err(|e| format!("read length: {}", e))?;
    let len = u32::from_be_bytes(len_buf) as usize;
    if len > 12 * 1024 * 1024 {
        return Err("frame too large".to_string());
    }
    let mut buf = vec![0u8; len];
    reader
        .read_exact(&mut buf)
        .map_err(|e| format!("read body: {}", e))?;
    serde_json::from_slice(&buf).map_err(|e| format!("parse json: {}", e))
}

pub(crate) fn write_frame<T: Serialize, W: Write>(writer: &mut W, value: &T) -> Result<(), String> {
    let body = serde_json::to_vec(value).map_err(|e| format!("serialize: {}", e))?;
    let len = body.len();
    if len > 12 * 1024 * 1024 {
        return Err("frame too large".to_string());
    }
    let len_buf = (len as u32).to_be_bytes();
    writer
        .write_all(&len_buf)
        .and_then(|_| writer.write_all(&body))
        .map_err(|e| format!("write: {}", e))?;
    Ok(())
}

pub fn cleanup_mcp_socket(app_data: &Path) {
    #[cfg(unix)]
    {
        let path = mcp_socket_path(app_data);
        if path.exists() && !can_connect_to_unix_socket(&path) {
            let _ = fs::remove_file(path);
        }
    }
    #[cfg(not(unix))]
    {
        let _ = app_data;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pending(label: &str) -> PendingReply {
        PendingReply {
            window_label: label.to_string(),
            generation: 0,
            notify: Arc::new((Mutex::new(false), Condvar::new())),
            result: Arc::new(Mutex::new(None)),
        }
    }

    #[test]
    fn reply_from_other_window_keeps_pending() {
        let mut pending_map = HashMap::new();
        pending_map.insert("id".to_string(), pending("schedule-2"));
        assert!(take_pending_reply_for_window(&mut pending_map, "id", "schedule-3").is_none());
        assert!(pending_map.contains_key("id"));
        let taken = take_pending_reply_for_window(&mut pending_map, "id", "schedule-2");
        assert_eq!(
            taken.as_ref().map(|entry| entry.window_label.as_str()),
            Some("schedule-2")
        );
        assert!(!pending_map.contains_key("id"));
    }
}
