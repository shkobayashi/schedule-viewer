//! OS ファイルダイアログの種類（フィルタ）。rfd は拡張子の前に `*.` を付ける。

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DialogFilterSpec {
    pub name: String,
    pub extension: String,
}

#[cfg(target_os = "macos")]
fn json_only_filter() -> Vec<DialogFilterSpec> {
    vec![DialogFilterSpec {
        name: "JSON".into(),
        extension: "json".into(),
    }]
}

#[cfg(not(target_os = "macos"))]
pub fn schedule_open_save_filters() -> Vec<DialogFilterSpec> {
    vec![
        DialogFilterSpec {
            name: "JSON".into(),
            extension: "json".into(),
        },
        DialogFilterSpec {
            name: "スケジュール".into(),
            extension: "schedule.json".into(),
        },
    ]
}

#[cfg(target_os = "macos")]
pub fn schedule_open_save_filters() -> Vec<DialogFilterSpec> {
    json_only_filter()
}

#[cfg(not(target_os = "macos"))]
pub fn members_import_filters() -> Vec<DialogFilterSpec> {
    vec![
        DialogFilterSpec {
            name: "members.json".into(),
            extension: "members.json".into(),
        },
        DialogFilterSpec {
            name: "JSON".into(),
            extension: "json".into(),
        },
    ]
}

#[cfg(target_os = "macos")]
pub fn members_import_filters() -> Vec<DialogFilterSpec> {
    json_only_filter()
}

#[cfg(not(target_os = "macos"))]
pub fn calendar_import_filters() -> Vec<DialogFilterSpec> {
    vec![
        DialogFilterSpec {
            name: "calendar.json".into(),
            extension: "calendar.json".into(),
        },
        DialogFilterSpec {
            name: "JSON".into(),
            extension: "json".into(),
        },
    ]
}

#[cfg(target_os = "macos")]
pub fn calendar_import_filters() -> Vec<DialogFilterSpec> {
    json_only_filter()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(not(target_os = "macos"))]
    #[test]
    fn schedule_filters_default_to_json_then_schedule_suffix() {
        let filters = schedule_open_save_filters();
        assert_eq!(filters.len(), 2);
        assert_eq!(filters[0].name, "JSON");
        assert_eq!(filters[0].extension, "json");
        assert_eq!(filters[1].name, "スケジュール");
        assert_eq!(filters[1].extension, "schedule.json");
    }

    #[cfg(not(target_os = "macos"))]
    #[test]
    fn members_filters_default_to_members_suffix_then_json() {
        let filters = members_import_filters();
        assert_eq!(filters.len(), 2);
        assert_eq!(filters[0].name, "members.json");
        assert_eq!(filters[0].extension, "members.json");
        assert_eq!(filters[1].name, "JSON");
        assert_eq!(filters[1].extension, "json");
    }

    #[cfg(not(target_os = "macos"))]
    #[test]
    fn calendar_filters_default_to_calendar_suffix_then_json() {
        let filters = calendar_import_filters();
        assert_eq!(filters.len(), 2);
        assert_eq!(filters[0].name, "calendar.json");
        assert_eq!(filters[0].extension, "calendar.json");
        assert_eq!(filters[1].name, "JSON");
        assert_eq!(filters[1].extension, "json");
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_json_dialogs_keep_a_single_json_filter() {
        for filters in [
            schedule_open_save_filters(),
            members_import_filters(),
            calendar_import_filters(),
        ] {
            assert_eq!(filters.len(), 1);
            assert_eq!(filters[0].name, "JSON");
            assert_eq!(filters[0].extension, "json");
        }
    }
}
