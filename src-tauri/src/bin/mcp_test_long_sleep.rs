//! Test helper: sleeps for N seconds (default 3600). Works when copied/renamed on Linux and Windows.

use std::{env, thread, time::Duration};

fn main() {
    let secs: u64 = env::args()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(3600);
    thread::sleep(Duration::from_secs(secs));
}