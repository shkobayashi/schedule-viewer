use std::collections::VecDeque;
use std::path::Path;

use crate::{screen_cli, mcp_stdio};

pub fn should_open_paths_from_launch(args: &[String]) -> bool {
    if mcp_stdio::is_mcp_stdio_mode(args) {
        return false;
    }
    if screen_cli::parse_screen_tool(args).is_some() {
        return false;
    }
    if screen_cli::is_screen_flag(args) {
        return false;
    }
    true
}

pub fn paths_from_launch_args(args: &[String]) -> Vec<String> {
    if !should_open_paths_from_launch(args) {
        return Vec::new();
    }
    args.iter()
        .filter(|arg| path_argument(arg))
        .cloned()
        .collect()
}

/// 2つ目のプロセスから渡る引数。先頭は実行ファイルのパスなので除く。
pub fn paths_from_single_instance_args(args: &[String]) -> Vec<String> {
    if args.len() <= 1 {
        return Vec::new();
    }
    paths_from_launch_args(&args[1..])
}

fn path_argument(arg: &str) -> bool {
    if arg.starts_with('-') {
        return false;
    }
    let path = Path::new(arg);
    path.is_absolute()
        || arg.contains('/')
        || arg.contains('\\')
        || path.extension().is_some()
}

pub fn paths_from_opened_urls(urls: &[url::Url]) -> Vec<String> {
    urls.iter()
        .filter_map(|url| url.to_file_path().ok())
        .map(|path| path.to_string_lossy().into_owned())
        .collect()
}

pub fn batch_fingerprint(paths: &[String]) -> String {
    paths.join("\u{1f}")
}

#[derive(Default)]
pub struct ExternalDropQueue {
    batches: VecDeque<Vec<String>>,
}

impl ExternalDropQueue {
    pub fn enqueue(&mut self, paths: Vec<String>) {
        if paths.is_empty() {
            return;
        }
        let fingerprint = batch_fingerprint(&paths);
        if self
            .batches
            .iter()
            .any(|batch| batch_fingerprint(batch) == fingerprint)
        {
            return;
        }
        self.batches.push_back(paths);
    }

    pub fn peek(&self) -> Option<&[String]> {
        self.batches.front().map(|batch| batch.as_slice())
    }

    pub fn pop_front(&mut self) -> Option<Vec<String>> {
        self.batches.pop_front()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skips_mcp_launch() {
        assert!(!should_open_paths_from_launch(&["--mcp".to_string()]));
    }

    #[test]
    fn skips_screen_launch() {
        assert!(!should_open_paths_from_launch(
            &["--screen".to_string(), "schedule_diff".to_string()],
        ));
    }

    #[test]
    fn collects_absolute_paths_from_launch() {
        let paths = paths_from_launch_args(&[
            "/tmp/a.json".to_string(),
            "--foo".to_string(),
            "relative.json".to_string(),
        ]);
        assert_eq!(paths, vec!["/tmp/a.json".to_string(), "relative.json".to_string()]);
    }

    #[test]
    fn skips_executable_in_single_instance_args() {
        let paths = paths_from_single_instance_args(&[
            "/Applications/schedule-viewer.app/Contents/MacOS/schedule-viewer".to_string(),
            "/tmp/a.json".to_string(),
        ]);
        assert_eq!(paths, vec!["/tmp/a.json".to_string()]);
    }

    #[test]
    fn dedupes_identical_batches_in_queue() {
        let mut queue = ExternalDropQueue::default();
        queue.enqueue(vec!["/a.json".to_string()]);
        queue.enqueue(vec!["/a.json".to_string()]);
        assert_eq!(queue.batches.len(), 1);
    }

    #[test]
    fn accepts_same_batch_after_pop() {
        let mut queue = ExternalDropQueue::default();
        queue.enqueue(vec!["/a.json".to_string()]);
        assert_eq!(queue.pop_front().map(|b| b.len()), Some(1));
        queue.enqueue(vec!["/a.json".to_string()]);
        assert_eq!(queue.batches.len(), 1);
    }
}
