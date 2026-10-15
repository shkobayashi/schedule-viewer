// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if schedule_viewer_lib::mcp_stdio::is_mcp_stdio_mode(&args) {
        if let Err(err) = schedule_viewer_lib::mcp_stdio::run_mcp_stdio() {
            eprintln!("{err}");
            std::process::exit(1);
        }
        return;
    }
    if let Some(tool) = schedule_viewer_lib::screen_cli::parse_screen_tool(&args) {
        std::process::exit(schedule_viewer_lib::screen_cli::run_screen_cli(tool));
    }
    if schedule_viewer_lib::screen_cli::is_screen_flag(&args) {
        eprintln!(
            "使えるのは --screen schedule_diff、--screen baseline_diffs、--screen selected_task、--screen selected_tasks、--screen filtered_tasks、--screen replace_schedule だけです。"
        );
        std::process::exit(1);
    }
    schedule_viewer_lib::run()
}
