use std::collections::HashMap;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{State, Window};

use crate::window_label;

#[derive(Default)]
pub struct MemberCatalogEditState {
    by_catalog: HashMap<String, String>,
}

#[derive(Serialize)]
pub struct ClaimMemberCatalogEditResult {
    pub claimed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub holder_label: Option<String>,
}

#[tauri::command]
pub fn claim_member_catalog_edit(
    window: Window,
    state: State<'_, Mutex<MemberCatalogEditState>>,
    catalog_id: String,
) -> Result<ClaimMemberCatalogEditResult, String> {
    let id = catalog_id.trim();
    if id.is_empty() {
        return Err("カタログ名が空です。".to_string());
    }
    let label = window_label(&window);
    let mut guard = state.lock().expect("member catalog edit");
    if let Some(holder) = guard.by_catalog.get(id) {
        if holder != &label {
            return Ok(ClaimMemberCatalogEditResult {
                claimed: false,
                holder_label: Some(holder.clone()),
            });
        }
        return Ok(ClaimMemberCatalogEditResult {
            claimed: true,
            holder_label: None,
        });
    }
    guard.by_catalog.insert(id.to_string(), label);
    Ok(ClaimMemberCatalogEditResult {
        claimed: true,
        holder_label: None,
    })
}

#[tauri::command]
pub fn release_member_catalog_edit(
    window: Window,
    state: State<'_, Mutex<MemberCatalogEditState>>,
    catalog_id: Option<String>,
) -> Result<(), String> {
    let label = window_label(&window);
    let mut guard = state.lock().expect("member catalog edit");
    match catalog_id {
        None => {
            guard.by_catalog.retain(|_, holder| holder != &label);
        }
        Some(id) => {
            let id = id.trim();
            if id.is_empty() {
                return Ok(());
            }
            if guard.by_catalog.get(id) == Some(&label) {
                guard.by_catalog.remove(id);
            }
        }
    }
    Ok(())
}

pub fn release_all_member_catalog_edits_for_label(
    state: &mut MemberCatalogEditState,
    label: &str,
) {
    state.by_catalog.retain(|_, holder| holder != label);
}
