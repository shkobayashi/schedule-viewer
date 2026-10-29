use std::collections::HashMap;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{State, Window};

use crate::window_label;

#[derive(Default)]
pub struct ColorCatalogEditState {
    by_catalog: HashMap<String, String>,
}

#[derive(Serialize)]
pub struct ClaimColorCatalogEditResult {
    pub claimed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub holder_label: Option<String>,
}

#[tauri::command]
pub fn claim_color_catalog_edit(
    window: Window,
    state: State<'_, Mutex<ColorCatalogEditState>>,
    catalog_id: String,
) -> Result<ClaimColorCatalogEditResult, String> {
    let id = catalog_id.trim();
    if id.is_empty() {
        return Err("カタログ名が空です。".to_string());
    }
    let label = window_label(&window);
    let mut guard = state.lock().expect("color catalog edit");
    if let Some(holder) = guard.by_catalog.get(id) {
        if holder != &label {
            return Ok(ClaimColorCatalogEditResult {
                claimed: false,
                holder_label: Some(holder.clone()),
            });
        }
        return Ok(ClaimColorCatalogEditResult {
            claimed: true,
            holder_label: None,
        });
    }
    guard.by_catalog.insert(id.to_string(), label);
    Ok(ClaimColorCatalogEditResult {
        claimed: true,
        holder_label: None,
    })
}

#[tauri::command]
pub fn release_color_catalog_edit(
    window: Window,
    state: State<'_, Mutex<ColorCatalogEditState>>,
    catalog_id: Option<String>,
) -> Result<(), String> {
    let label = window_label(&window);
    let mut guard = state.lock().expect("color catalog edit");
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

pub fn release_all_color_catalog_edits_for_label(
    state: &mut ColorCatalogEditState,
    label: &str,
) {
    state.by_catalog.retain(|_, holder| holder != label);
}
