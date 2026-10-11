use std::ffi::c_void;
use std::fs::File;
use std::os::windows::io::{FromRawHandle, IntoRawHandle};
use std::ptr;
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

use serde_json::Value;
use tauri::AppHandle;
use windows_sys::Win32::Foundation::{
    CloseHandle, GetLastError, LocalFree, ERROR_FILE_NOT_FOUND, ERROR_PIPE_BUSY,
    ERROR_PIPE_CONNECTED, GENERIC_READ, GENERIC_WRITE, HANDLE, INVALID_HANDLE_VALUE,
};
use windows_sys::Win32::Security::Authorization::ConvertStringSecurityDescriptorToSecurityDescriptorW;
use windows_sys::Win32::Security::SECURITY_ATTRIBUTES;
use windows_sys::Win32::Storage::FileSystem::{
    CreateFileW, FILE_ATTRIBUTE_NORMAL, OPEN_EXISTING, PIPE_ACCESS_DUPLEX,
};
use windows_sys::Win32::System::Pipes::{
    ConnectNamedPipe, CreateNamedPipeW, DisconnectNamedPipe, SetNamedPipeHandleState,
    PIPE_READMODE_BYTE, PIPE_REJECT_REMOTE_CLIENTS, PIPE_TYPE_BYTE, PIPE_WAIT,
};

use crate::mcp_app_data::{current_user_sid_string, mcp_pipe_name_for_current_user};
use crate::mcp_bridge::{
    bridge_exchange, handle_bridge_connection_io, McpBridgeError, McpBridgeState,
    MCP_PIPE_CONNECT_TIMEOUT,
};

const SDDL_REVISION_1: u32 = 1;
const PIPE_SERVER_RETRY_SLEEP: Duration = Duration::from_millis(100);
const PIPE_CLIENT_BUSY_SLEEP: Duration = Duration::from_millis(50);

fn wide_null(s: &str) -> Vec<u16> {
    s.encode_utf16().chain([0]).collect()
}

struct PipeSecurity {
    attributes: SECURITY_ATTRIBUTES,
    descriptor: *mut c_void,
}

impl PipeSecurity {
    fn for_current_user() -> Result<Self, String> {
        let sid = current_user_sid_string()?;
        let sddl = format!("D:(A;;GA;;;{})", sid);
        let wide = wide_null(&sddl);
        let mut descriptor = ptr::null_mut();
        if unsafe {
            ConvertStringSecurityDescriptorToSecurityDescriptorW(
                wide.as_ptr(),
                SDDL_REVISION_1,
                &mut descriptor,
                ptr::null_mut(),
            )
        } == 0
        {
            return Err("MCP パイプの権限を設定できません。".to_string());
        }
        Ok(Self {
            attributes: SECURITY_ATTRIBUTES {
                nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
                lpSecurityDescriptor: descriptor,
                bInheritHandle: 0,
            },
            descriptor,
        })
    }
}

impl Drop for PipeSecurity {
    fn drop(&mut self) {
        if !self.descriptor.is_null() {
            let _ = unsafe { LocalFree(self.descriptor) };
        }
    }
}

pub fn can_connect_to_pipe(pipe_name: &str) -> bool {
    open_pipe_client(pipe_name).is_ok()
}

fn open_pipe_client(pipe_name: &str) -> Result<File, u32> {
    let wide = wide_null(pipe_name);
    let handle = unsafe {
        CreateFileW(
            wide.as_ptr(),
            GENERIC_READ | GENERIC_WRITE,
            0,
            ptr::null(),
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL,
            HANDLE::default(),
        )
    };
    if handle == INVALID_HANDLE_VALUE {
        return Err(unsafe { GetLastError() });
    }
    let mode = PIPE_READMODE_BYTE;
    if unsafe {
        SetNamedPipeHandleState(handle, &mode, ptr::null_mut(), ptr::null_mut())
    } == 0
    {
        let err = unsafe { GetLastError() };
        let _ = unsafe { CloseHandle(handle) };
        return Err(err);
    }
    Ok(unsafe { File::from_raw_handle(handle as _) })
}

fn create_pipe_server(pipe_name: &str, security: &PipeSecurity) -> Result<HANDLE, String> {
    let wide = wide_null(pipe_name);
    let mode = PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS;
    let handle = unsafe {
        CreateNamedPipeW(
            wide.as_ptr(),
            PIPE_ACCESS_DUPLEX,
            mode,
            1,
            64 * 1024,
            64 * 1024,
            0,
            &security.attributes,
        )
    };
    if handle == INVALID_HANDLE_VALUE {
        return Err("MCP パイプを開けません。".to_string());
    }
    Ok(handle)
}

pub fn start_mcp_bridge_server(app: AppHandle, state: Arc<McpBridgeState>) -> Result<(), String> {
    let pipe_name = mcp_pipe_name_for_current_user()?;
    if can_connect_to_pipe(&pipe_name) {
        return Ok(());
    }
    thread::spawn(move || pipe_server_loop(app, state, pipe_name));
    Ok(())
}

fn pipe_server_loop(app: AppHandle, state: Arc<McpBridgeState>, pipe_name: String) {
    let security = match PipeSecurity::for_current_user() {
        Ok(value) => value,
        Err(err) => {
            eprintln!("{err}");
            return;
        }
    };
    loop {
        let handle = match create_pipe_server(&pipe_name, &security) {
            Ok(value) => value,
            Err(err) => {
                eprintln!("{err}");
                thread::sleep(PIPE_SERVER_RETRY_SLEEP);
                continue;
            }
        };
        let connected = unsafe { ConnectNamedPipe(handle, ptr::null_mut()) };
        if connected == 0 {
            let err = unsafe { GetLastError() };
            if err != ERROR_PIPE_CONNECTED {
                let _ = unsafe { CloseHandle(handle) };
                eprintln!("MCP パイプの接続を待てません: {}", err);
                thread::sleep(PIPE_SERVER_RETRY_SLEEP);
                continue;
            }
        }
        let mut file = unsafe { File::from_raw_handle(handle as _) };
        let _ = handle_bridge_connection_io(&app, &state, &mut file);
        let raw = file.into_raw_handle();
        let _ = unsafe { DisconnectNamedPipe(raw as HANDLE) };
        let _ = unsafe { CloseHandle(raw as HANDLE) };
    }
}

fn open_pipe_client_with_retry(pipe_name: &str) -> Result<File, McpBridgeError> {
    let deadline = Instant::now() + MCP_PIPE_CONNECT_TIMEOUT;
    loop {
        match open_pipe_client(pipe_name) {
            Ok(file) => return Ok(file),
            Err(err) => {
                if err == ERROR_FILE_NOT_FOUND {
                    return Err(McpBridgeError::NoGui);
                }
                if err == ERROR_PIPE_BUSY {
                    if Instant::now() >= deadline {
                        return Err(McpBridgeError::Stale);
                    }
                    thread::sleep(PIPE_CLIENT_BUSY_SLEEP);
                    continue;
                }
                return Err(McpBridgeError::NoGui);
            }
        }
    }
}

pub fn call_tool_via_bridge(tool: &str, arguments: Value) -> Result<Value, McpBridgeError> {
    let pipe_name = mcp_pipe_name_for_current_user().map_err(|_| McpBridgeError::NoGui)?;
    let mut stream = open_pipe_client_with_retry(&pipe_name)?;
    bridge_exchange(&mut stream, tool, arguments)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mcp_app_data::mcp_pipe_name;
    use crate::mcp_bridge::{read_frame, write_frame, BridgeRequest, BridgeResponse, BRIDGE_VERSION};
    use std::sync::mpsc;
    use std::time::Duration;

    #[test]
    fn pipe_roundtrips_length_prefixed_frame() {
        let pipe_name = mcp_pipe_name("S-1-5-21-schedule-viewer-test-roundtrip");
        let server_name = pipe_name.clone();
        let (ready_tx, ready_rx) = mpsc::channel();
        let server = thread::spawn(move || {
            let security = PipeSecurity::for_current_user().expect("security");
            let handle = create_pipe_server(&server_name, &security).expect("server pipe");
            let _ = ready_tx.send(());
            let connected = unsafe { ConnectNamedPipe(handle, ptr::null_mut()) };
            if connected == 0 {
                let err = unsafe { GetLastError() };
                if err != ERROR_PIPE_CONNECTED {
                    panic!("connect: {}", err);
                }
            }
            let mut file = unsafe { File::from_raw_handle(handle as _) };
            let request: BridgeRequest =
                read_frame(&mut file).expect("read request");
            assert_eq!(request.v, BRIDGE_VERSION);
            let response = BridgeResponse {
                v: BRIDGE_VERSION,
                id: request.id,
                body: Some(serde_json::json!({ "ok": true })),
                error: None,
            };
            write_frame(&mut file, &response).expect("write response");
            let raw = file.into_raw_handle();
            let _ = unsafe { DisconnectNamedPipe(raw as HANDLE) };
            let _ = unsafe { CloseHandle(raw as HANDLE) };
        });
        ready_rx.recv_timeout(Duration::from_secs(5)).expect("server ready");
        let mut client = open_pipe_client(&pipe_name).expect("client");
        let request = BridgeRequest {
            v: BRIDGE_VERSION,
            id: "test-id".to_string(),
            tool: "screen_context".to_string(),
            arguments: serde_json::json!({}),
        };
        write_frame(&mut client, &request).expect("write request");
        let response: BridgeResponse = read_frame(&mut client).expect("read response");
        assert_eq!(response.id, "test-id");
        server.join().expect("server thread");
    }

    #[test]
    fn skips_new_listener_when_pipe_is_alive() {
        let pipe_name = mcp_pipe_name("S-1-5-21-schedule-viewer-test-alive");
        let security = PipeSecurity::for_current_user().expect("security");
        let handle = create_pipe_server(&pipe_name, &security).expect("server pipe");
        assert!(can_connect_to_pipe(&pipe_name));
        let _ = unsafe { CloseHandle(handle) };
    }

    #[test]
    fn open_pipe_client_with_retry_waits_for_busy_pipe() {
        use std::sync::{Arc, Mutex};

        let pipe_name = mcp_pipe_name("S-1-5-21-schedule-viewer-test-busy");
        let security = PipeSecurity::for_current_user().expect("security");
        let server_handle = create_pipe_server(&pipe_name, &security).expect("server pipe");
        let server = thread::spawn(move || {
            let connected = unsafe { ConnectNamedPipe(server_handle, ptr::null_mut()) };
            if connected == 0 {
                let err = unsafe { GetLastError() };
                if err != ERROR_PIPE_CONNECTED {
                    panic!("connect: {}", err);
                }
            }
            thread::sleep(Duration::from_millis(300));
            let _ = unsafe { DisconnectNamedPipe(server_handle) };
            let _ = unsafe { CloseHandle(server_handle) };
        });

        let client_hold = open_pipe_client(&pipe_name).expect("first client");
        assert_eq!(
            open_pipe_client(&pipe_name).unwrap_err(),
            ERROR_PIPE_BUSY,
        );

        let shared = Arc::new(Mutex::new(Some(client_hold)));
        let shared_clone = Arc::clone(&shared);
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(80));
            shared_clone.lock().expect("hold").take();
        });

        let file = open_pipe_client_with_retry(&pipe_name).expect("retry connects");
        drop(file);
        server.join().expect("server thread");
    }
}
