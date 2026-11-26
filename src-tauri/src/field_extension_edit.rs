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

pub(crate) fn claim_field_extension_edit_state(
    state: &mut FieldExtensionEditState,
    edit_key: &str,
    label: &str,
) -> Result<ClaimFieldExtensionEditResult, String> {
    let key = edit_key.trim();
    if key.is_empty() {
        return Err("編集対象が空です。".to_string());
    }
    if let Some(holder) = state.by_key.get(key) {
        if holder != label {
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
    state.by_key.insert(key.to_string(), label.to_string());
    Ok(ClaimFieldExtensionEditResult {
        claimed: true,
        holder_label: None,
    })
}

pub(crate) fn release_field_extension_edit_state(
    state: &mut FieldExtensionEditState,
    edit_key: Option<&str>,
    label: &str,
) {
    match edit_key {
        None => {
            state.by_key.retain(|_, holder| holder != label);
        }
        Some(key) => {
            let key = key.trim();
            if key.is_empty() {
                return;
            }
            if state.by_key.get(key).is_some_and(|holder| holder == label) {
                state.by_key.remove(key);
            }
        }
    }
}

#[tauri::command]
pub fn claim_field_extension_edit(
    window: Window,
    state: State<'_, Mutex<FieldExtensionEditState>>,
    edit_key: String,
) -> Result<ClaimFieldExtensionEditResult, String> {
    let label = window_label(&window);
    let mut guard = state.lock().expect("field extension edit");
    claim_field_extension_edit_state(&mut guard, &edit_key, &label)
}

#[tauri::command]
pub fn release_field_extension_edit(
    window: Window,
    state: State<'_, Mutex<FieldExtensionEditState>>,
    edit_key: Option<String>,
) -> Result<(), String> {
    let label = window_label(&window);
    let mut guard = state.lock().expect("field extension edit");
    release_field_extension_edit_state(&mut guard, edit_key.as_deref(), &label);
    Ok(())
}

pub fn release_all_field_extension_edits_for_label(
    state: &mut FieldExtensionEditState,
    label: &str,
) {
    state.by_key.retain(|_, holder| holder != label);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_id_is_rejected() {
        let mut state = FieldExtensionEditState::default();
        let result = claim_field_extension_edit_state(&mut state, "  ", "main");
        assert!(matches!(result, Err(message) if message == "編集対象が空です。"));
    }

    #[test]
    fn second_label_does_not_claim() {
        let mut state = FieldExtensionEditState::default();
        let first = claim_field_extension_edit_state(&mut state, "risk", "main").unwrap();
        assert!(first.claimed);
        let second = claim_field_extension_edit_state(&mut state, "risk", "schedule-2").unwrap();
        assert!(!second.claimed);
        assert_eq!(second.holder_label.as_deref(), Some("main"));
    }

    #[test]
    fn release_allows_the_other_label() {
        let mut state = FieldExtensionEditState::default();
        claim_field_extension_edit_state(&mut state, "risk", "main").unwrap();
        release_field_extension_edit_state(&mut state, Some("risk"), "main");
        let other = claim_field_extension_edit_state(&mut state, "risk", "schedule-2").unwrap();
        assert!(other.claimed);
    }
}
