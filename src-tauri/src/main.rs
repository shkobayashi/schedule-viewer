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
    schedule_viewer_lib::run()
}
