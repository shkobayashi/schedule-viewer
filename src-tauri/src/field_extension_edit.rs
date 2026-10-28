use std::collections::HashMap;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{State, Window};

use crate::window_label;

#[derive(Default)]
pub struct FieldExtensionEditState {
    by_key: HashMap<String, String>,
}

#[derive(Serialize)]
pub struct ClaimFieldExtensionEditResult {
    pub claimed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub holder_label: Option<String>,
}

#[tauri::command]
pub fn claim_field_extension_edit(
    window: Window,
    state: State<'_, Mutex<FieldExtensionEditState>>,
    edit_key: String,
) -> Result<ClaimFieldExtensionEditResult, String> {
    let key = edit_key.trim();
    if key.is_empty() {
        return Err("編集対象が空です。".to_string());
    }
    let label = window_label(&window);
    let mut guard = state.lock().expect("field extension edit");
    if let Some(holder) = guard.by_key.get(key) {
        if holder != &label {
            return Ok(ClaimFieldExtensionEditResult {
                claimed: false,
                holder_label: Some(holder.clone()),
            });
        }
        return Ok(ClaimFieldExtensionEditResult {
            claimed: true,
            holder_label: None,
        });
    }
    guard.by_key.insert(key.to_string(), label);
    Ok(ClaimFieldExtensionEditResult {
        claimed: true,
        holder_label: None,
    })
}

#[tauri::command]
pub fn release_field_extension_edit(
    window: Window,
    state: State<'_, Mutex<FieldExtensionEditState>>,
    edit_key: Option<String>,
) -> Result<(), String> {
    let label = window_label(&window);
    let mut guard = state.lock().expect("field extension edit");
    match edit_key {
        None => {
            guard.by_key.retain(|_, holder| holder != &label);
        }
        Some(key) => {
            let key = key.trim();
            if key.is_empty() {
                return Ok(());
            }
            if guard.by_key.get(key) == Some(&label) {
                guard.by_key.remove(key);
            }
        }
    }
    Ok(())
}

pub fn release_all_field_extension_edits_for_label(
    state: &mut FieldExtensionEditState,
    label: &str,
) {
    state.by_key.retain(|_, holder| holder != label);
}
