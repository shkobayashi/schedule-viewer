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

pub(crate) fn claim_color_catalog_edit_state(
    state: &mut ColorCatalogEditState,
    catalog_id: &str,
    label: &str,
) -> Result<ClaimColorCatalogEditResult, String> {
    let id = catalog_id.trim();
    if id.is_empty() {
        return Err("カタログ名が空です。".to_string());
    }
    if let Some(holder) = state.by_catalog.get(id) {
        if holder != label {
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
    state.by_catalog.insert(id.to_string(), label.to_string());
    Ok(ClaimColorCatalogEditResult {
        claimed: true,
        holder_label: None,
    })
}

pub(crate) fn release_color_catalog_edit_state(
    state: &mut ColorCatalogEditState,
    catalog_id: Option<&str>,
    label: &str,
) {
    match catalog_id {
        None => {
            state.by_catalog.retain(|_, holder| holder != label);
        }
        Some(id) => {
            let id = id.trim();
            if id.is_empty() {
                return;
            }
            if state.by_catalog.get(id).is_some_and(|holder| holder == label) {
                state.by_catalog.remove(id);
            }
        }
    }
}

#[tauri::command]
pub fn claim_color_catalog_edit(
    window: Window,
    state: State<'_, Mutex<ColorCatalogEditState>>,
    catalog_id: String,
) -> Result<ClaimColorCatalogEditResult, String> {
    let label = window_label(&window);
    let mut guard = state.lock().expect("color catalog edit");
    claim_color_catalog_edit_state(&mut guard, &catalog_id, &label)
}

#[tauri::command]
pub fn release_color_catalog_edit(
    window: Window,
    state: State<'_, Mutex<ColorCatalogEditState>>,
    catalog_id: Option<String>,
) -> Result<(), String> {
    let label = window_label(&window);
    let mut guard = state.lock().expect("color catalog edit");
    release_color_catalog_edit_state(&mut guard, catalog_id.as_deref(), &label);
    Ok(())
}

pub fn release_all_color_catalog_edits_for_label(
    state: &mut ColorCatalogEditState,
    label: &str,
) {
    state.by_catalog.retain(|_, holder| holder != label);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_id_is_rejected() {
        let mut state = ColorCatalogEditState::default();
        let result = claim_color_catalog_edit_state(&mut state, "  ", "main");
        assert!(matches!(result, Err(message) if message == "カタログ名が空です。"));
    }

    #[test]
    fn second_label_does_not_claim() {
        let mut state = ColorCatalogEditState::default();
        let first = claim_color_catalog_edit_state(&mut state, "palette", "main").unwrap();
        assert!(first.claimed);
        let second = claim_color_catalog_edit_state(&mut state, "palette", "schedule-2").unwrap();
        assert!(!second.claimed);
        assert_eq!(second.holder_label.as_deref(), Some("main"));
    }

    #[test]
    fn release_allows_the_other_label() {
        let mut state = ColorCatalogEditState::default();
        claim_color_catalog_edit_state(&mut state, "palette", "main").unwrap();
        release_color_catalog_edit_state(&mut state, Some("palette"), "main");
        let other = claim_color_catalog_edit_state(&mut state, "palette", "schedule-2").unwrap();
        assert!(other.claimed);
    }
}
