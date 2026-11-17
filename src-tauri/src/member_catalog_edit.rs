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

pub(crate) fn claim_member_catalog_edit_state(
    state: &mut MemberCatalogEditState,
    catalog_id: &str,
    label: &str,
) -> Result<ClaimMemberCatalogEditResult, String> {
    let id = catalog_id.trim();
    if id.is_empty() {
        return Err("カタログ名が空です。".to_string());
    }
    if let Some(holder) = state.by_catalog.get(id) {
        if holder != label {
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
    state.by_catalog.insert(id.to_string(), label.to_string());
    Ok(ClaimMemberCatalogEditResult {
        claimed: true,
        holder_label: None,
    })
}

pub(crate) fn release_member_catalog_edit_state(
    state: &mut MemberCatalogEditState,
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
pub fn claim_member_catalog_edit(
    window: Window,
    state: State<'_, Mutex<MemberCatalogEditState>>,
    catalog_id: String,
) -> Result<ClaimMemberCatalogEditResult, String> {
    let label = window_label(&window);
    let mut guard = state.lock().expect("member catalog edit");
    claim_member_catalog_edit_state(&mut guard, &catalog_id, &label)
}

#[tauri::command]
pub fn release_member_catalog_edit(
    window: Window,
    state: State<'_, Mutex<MemberCatalogEditState>>,
    catalog_id: Option<String>,
) -> Result<(), String> {
    let label = window_label(&window);
    let mut guard = state.lock().expect("member catalog edit");
    release_member_catalog_edit_state(&mut guard, catalog_id.as_deref(), &label);
    Ok(())
}

pub fn release_all_member_catalog_edits_for_label(
    state: &mut MemberCatalogEditState,
    label: &str,
) {
    state.by_catalog.retain(|_, holder| holder != label);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_id_is_rejected() {
        let mut state = MemberCatalogEditState::default();
        let result = claim_member_catalog_edit_state(&mut state, "  ", "main");
        assert!(matches!(result, Err(message) if message == "カタログ名が空です。"));
    }

    #[test]
    fn second_label_does_not_claim() {
        let mut state = MemberCatalogEditState::default();
        let first = claim_member_catalog_edit_state(&mut state, "team", "main").unwrap();
        assert!(first.claimed);
        let second = claim_member_catalog_edit_state(&mut state, "team", "schedule-2").unwrap();
        assert!(!second.claimed);
        assert_eq!(second.holder_label.as_deref(), Some("main"));
    }

    #[test]
    fn release_allows_the_other_label() {
        let mut state = MemberCatalogEditState::default();
        claim_member_catalog_edit_state(&mut state, "team", "main").unwrap();
        release_member_catalog_edit_state(&mut state, Some("team"), "main");
        let other = claim_member_catalog_edit_state(&mut state, "team", "schedule-2").unwrap();
        assert!(other.claimed);
    }
}
