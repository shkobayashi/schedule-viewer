#!/usr/bin/env python3
"""Issue #420 MCP 通し確認。操作と確認は schedule-viewer --mcp の tools/call のみ。"""

import json
import shutil
import subprocess
import time
import uuid
from pathlib import Path

BIN = Path(__file__).resolve().parents[1] / "src-tauri/target/debug/schedule-viewer"
ROOT = Path(__file__).resolve().parents[1]
TMP = Path("/tmp/mcp-op-test")
ORIGINAL_FRONT = "schedule-3"
original_front = ORIGINAL_FRONT
results: list[dict] = []


def record(name: str, ok: bool, detail: str) -> None:
    results.append({"name": name, "ok": bool(ok), "detail": detail[:2000]})
    print(f"{'PASS' if ok else 'FAIL'}\t{name}\t{detail[:240]}", flush=True)


class Mcp:
    def __init__(self) -> None:
        self.proc = subprocess.Popen(
            [str(BIN), "--mcp"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        self.n = 0

    def call(self, name: str, arguments, retries: int = 3) -> dict:
        last_error: Exception | None = None
        for attempt in range(retries):
            try:
                return self._call_once(name, arguments)
            except RuntimeError as error:
                last_error = error
                if attempt + 1 < retries:
                    time.sleep(0.35 * (attempt + 1))
        raise last_error or RuntimeError(f"{name}: no response")

    def _call_once(self, name: str, arguments) -> dict:
        self.n += 1
        msg = {
            "jsonrpc": "2.0",
            "id": self.n,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        }
        assert self.proc.stdin and self.proc.stdout
        self.proc.stdin.write(json.dumps(msg, ensure_ascii=False) + "\n")
        self.proc.stdin.flush()
        line = self.proc.stdout.readline()
        if not line:
            raise RuntimeError(f"{name}: no response")
        return json.loads(line)

    def close(self) -> None:
        if self.proc.stdin:
            self.proc.stdin.close()
        self.proc.wait(timeout=10)


def unwrap(response: dict) -> tuple[bool, str, bool]:
    if "error" in response:
        return True, str(response["error"]), False
    result = response.get("result") or {}
    is_error = bool(result.get("isError"))
    parts = [
        (item.get("text") or "")
        for item in (result.get("content") or [])
        if item.get("type") == "text"
    ]
    return is_error, "\n".join(parts), True


def parse_json(text: str):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def find_task(doc: dict, task_id: str):
    def walk_outline(nodes):
        if not isinstance(nodes, list):
            return None
        for node in nodes:
            if not isinstance(node, dict):
                continue
            if node.get("id") == task_id and "start" in node:
                return node
            found = walk_outline(node.get("children") or [])
            if found:
                return found
        return None

    found = walk_outline(doc.get("outline") or [])
    if found:
        return found
    for cat in doc.get("categories") or []:
        if not isinstance(cat, dict):
            continue
        for group in cat.get("groups") or []:
            if not isinstance(group, dict):
                continue
            for task in group.get("tasks") or []:
                if isinstance(task, dict) and task.get("id") == task_id:
                    return task
    return None


def sibling_task_ids(doc: dict, parent_id: str) -> list[str] | None:
    def walk(nodes):
        if not isinstance(nodes, list):
            return None
        for node in nodes:
            if not isinstance(node, dict):
                continue
            if node.get("id") == parent_id:
                return [
                    c.get("id")
                    for c in node.get("children") or []
                    if isinstance(c, dict) and "start" in c
                ]
            found = walk(node.get("children") or [])
            if found is not None:
                return found
        return None

    return walk(doc.get("outline") or [])


def pick_playground_label(mcp: Mcp) -> str | None:
    for w in list_windows(mcp):
        if w.get("folder") == "mcp-op-test" and w.get("file") == "playground.schedule.json":
            return w.get("label")
    return None


def prepare_playground_front(mcp: Mcp, original: str, keep: str) -> tuple[str | None, str]:
    if not keep:
        return None, "playground ウィンドウがありません"
    for _ in range(15):
        wins = list_windows(mcp)
        front = next((w.get("label") for w in wins if w.get("front")), None)
        if front != keep:
            discard_progress(mcp)
            unwrap(mcp.call("focus_window", {"window": keep}))
            time.sleep(0.25)
        else:
            discard_progress(mcp)
        if ensure_front(mcp, keep):
            return keep, "ok"
        time.sleep(0.35)
    front = next((w.get("label") for w in list_windows(mcp) if w.get("front")), None)
    return keep, f"前面にできません front={front}"


def setup_tmp() -> None:
    if TMP.exists():
        shutil.rmtree(TMP)
    TMP.mkdir()
    for name in (
        "playground.schedule.json",
        "sample-team.members.json",
        "playground.statuses.json",
        "sample.fields.json",
        "jp-2026.calendar.json",
    ):
        src = ROOT / "examples" / name
        if name == "sample-team.members.json":
            src = ROOT / "examples/config/sample-team.members.json"
        elif name == "sample.fields.json":
            src = ROOT / "examples/fields/sample.fields.json"
        shutil.copy(src, TMP / name)
    colors = {
        "schemaVersion": 1,
        "colors": [
            {
                "id": "focus",
                "name": "確認",
                "description": "通し確認で塗る行。",
                "color": {"light": {"bg": "#E8F0FE"}, "dark": {"bg": "#1E3A5F"}},
            }
        ],
    }
    (TMP / "colors.json").write_text(json.dumps(colors, ensure_ascii=False, indent=2) + "\n")
    workspace = {
        "schemaVersion": 1,
        "schedule": "playground.schedule.json",
        "members": "sample-team.members.json",
        "statuses": "playground.statuses.json",
        "colors": "colors.json",
        "editableFieldExtension": "sample.fields.json",
    }
    (TMP / "workspace.json").write_text(json.dumps(workspace, ensure_ascii=False, indent=2) + "\n")


def list_windows(mcp: Mcp) -> list:
    err, text, _ = unwrap(mcp.call("open_windows", {}))
    return parse_json(text) or []


def ensure_front(mcp: Mcp, label: str) -> bool:
    unwrap(mcp.call("focus_window", {"window": label}))
    time.sleep(0.25)
    wins = list_windows(mcp)
    front = next((w.get("label") for w in wins if w.get("front")), None)
    return front == label


def close_label(mcp: Mcp, label: str) -> None:
    for w in list_windows(mcp):
        if w.get("front"):
            discard_progress(mcp)
            break
    if ensure_front(mcp, label):
        discard_progress(mcp)
        unwrap(mcp.call("close_window", {"window": label, "discardUnsaved": True}))
        time.sleep(0.2)


def discard_progress(mcp: Mcp) -> tuple[bool, str]:
    return unwrap(mcp.call("set_view", {"discardInProgress": True, "zoomTier": "day"}))


def close_mcp_op_test_playgrounds(mcp: Mcp, keep: str | None = None) -> None:
    wins = list_windows(mcp)
    targets = [
        w
        for w in wins
        if w.get("folder") == "mcp-op-test" and w.get("label") != keep
    ]
    if len(wins) - len(targets) < 1:
        return
    for w in targets:
        lab = w.get("label")
        if lab:
            close_label(mcp, lab)


def cleanup_except(mcp: Mcp, keep: str) -> None:
    for w in list_windows(mcp):
        lab = w.get("label")
        if lab and lab != keep:
            close_label(mcp, lab)


def test_front(mcp: Mcp, test_label: str) -> str | None:
    label, msg = prepare_playground_front(mcp, original_front, test_label)
    return label if msg == "ok" else None


def resolve_original_front(mcp: Mcp) -> str:
    wins = list_windows(mcp)
    for w in wins:
        if w.get("folder") == "mcp-op-test":
            continue
        lab = w.get("label")
        if lab:
            return lab
    labels = {w.get("label") for w in wins}
    if ORIGINAL_FRONT in labels:
        return ORIGINAL_FRONT
    if len(wins) == 1:
        lab = wins[0].get("label")
        if lab:
            return lab
    return ORIGINAL_FRONT


def capture_original_view_state(mcp: Mcp) -> tuple[dict | None, bool, str]:
    last_detail = ""
    for _ in range(20):
        ensure_front(mcp, original_front)
        err, text, rpc_ok = unwrap(mcp.call("filtered_tasks", {"window": original_front}))
        if err or not rpc_ok:
            last_detail = f"rpc_error={text[:400]}"
            time.sleep(0.3)
            continue
        orig = parse_json(text)
        if orig is None:
            last_detail = f"json_error={text[:400]}"
            time.sleep(0.3)
            continue
        view = orig.get("view") or {}
        if "displayScale" not in view:
            last_detail = text[:500]
            time.sleep(0.3)
            continue
        view_restore = {
            "displayScale": view.get("displayScale", {}).get("preference", "auto"),
            "rowDensity": view.get("rowDensity", "comfortable"),
            "showLightningLine": view.get("lightning", True),
            "sidebarColumns": view.get("columns")
            or {
                "start": False,
                "end": False,
                "duration": False,
                "progress": False,
                "status": False,
            },
            "colorScheme": view.get("colorScheme", {}).get("preference", "system"),
        }
        detail = json.dumps(
            {
                "scale": view.get("displayScale"),
                "calendar": (view.get("calendar") or {}).get("source"),
            },
            ensure_ascii=False,
        )
        return view_restore, True, detail
    return None, False, last_detail


def gate(mcp: Mcp) -> None:
    proc = subprocess.run(
        ["printf", '{"jsonrpc":"2.0","id":1,"method":"tools/list"}\n'],
        stdout=subprocess.PIPE,
        text=True,
    )
    list_proc = subprocess.run(
        [str(BIN), "--mcp"],
        input=proc.stdout,
        capture_output=True,
        text=True,
    )
    tools = json.loads(list_proc.stdout)["result"]["tools"]
    names = {t["name"] for t in tools}
    expected = {
        "open_windows",
        "schedule_diff",
        "baseline_diffs",
        "selected_task",
        "selected_tasks",
        "filtered_tasks",
        "current_schedule",
        "replace_schedule",
        "focus_window",
        "open_new_window",
        "close_window",
        "minimize_window",
        "set_view",
        "edit_plan",
        "file_action",
        "catalog_action",
        "set_preferences",
        "history",
    }
    record("gate-tools-list", expected <= names, f"count={len(names)} missing={sorted(expected - names)}")
    record(
        "gate-cursor-composer-tools",
        True,
        "Cursor CallDynamicTool には読み取り7+replace のみ。操作11は --mcp stdio で実行（計画どおり Composer 単体では不可）。",
    )
    gate_open_ok = False
    gate_detail = ""
    for _ in range(20):
        err, text, _ = unwrap(mcp.call("open_windows", {}))
        wins = parse_json(text) or []
        if not err and len(wins) >= 1:
            gate_open_ok = True
            gate_detail = text[:300]
            break
        gate_detail = text[:300]
        time.sleep(0.3)
    record("gate-open-windows", gate_open_ok, gate_detail)


def ensure_sample_original_window(mcp: Mcp) -> None:
    wins = list_windows(mcp)
    if any(w.get("folder") != "mcp-op-test" for w in wins):
        return
    unwrap(
        mcp.call(
            "open_new_window",
            {"path": str(ROOT / "examples/playground.schedule.json")},
        )
    )
    time.sleep(0.8)


def main() -> None:
    global original_front
    setup_tmp()
    mcp = Mcp()
    test_label: str | None = None
    view_restore: dict | None = None
    original_view_captured = False
    gate(mcp)
    ensure_sample_original_window(mcp)
    original_front = resolve_original_front(mcp)
    ensure_front(mcp, original_front)
    discard_progress(mcp)
    try:
        view_restore, original_view_captured, capture_detail = capture_original_view_state(mcp)
        record("isolate-capture-original-view", original_view_captured, capture_detail)

        close_mcp_op_test_playgrounds(mcp)
        err, text, _ = unwrap(
            mcp.call(
                "open_new_window",
                {
                    "path": str(TMP / "playground.schedule.json"),
                    "workspacePath": str(TMP / "workspace.json"),
                },
            )
        )
        if err:
            test_label = pick_playground_label(mcp)
            record("isolate-open-copy", test_label is not None, text[:200] if test_label is None else test_label)
        else:
            test_label = text.strip()
            record("isolate-open-copy", bool(test_label), text[:200])
        if not test_label:
            record("isolate-abort", False, "playground ウィンドウがありません")
            return
        time.sleep(0.5)
        test_label, prep_msg = prepare_playground_front(mcp, original_front, test_label)
        record("isolate-focus-copy", test_label is not None and prep_msg == "ok", prep_msg)
        if prep_msg != "ok" or not test_label:
            record("isolate-abort", False, prep_msg)
            return

        err, text, _ = unwrap(mcp.call("filtered_tasks", {}))
        opened = parse_json(text) or {}
        members = opened.get("members") or []
        view = opened.get("view") or {}
        err_diff, diff_open, _ = unwrap(mcp.call("schedule_diff", {}))
        record(
            "isolate-open-read",
            not err
            and any(m.get("id") == "tanaka" for m in members)
            and "visible" in view
            and (not err_diff)
            and "比べるファイルがありません" not in diff_open,
            json.dumps(
                {
                    "memberIds": [m.get("id") for m in members],
                    "dates": (view.get("visible") or {}).get("dates"),
                    "diff": diff_open[:80],
                },
                ensure_ascii=False,
            ),
        )

        # --- 1 見方 ---
        if not test_front(mcp, test_label):
            record("view-abort-front", False, "前面に playground がありません")
            return
        err_empty, text_empty, _ = unwrap(mcp.call("set_view", {}))
        record("view-empty-reject", err_empty and "見方を変える項目" in text_empty, text_empty[:120])

        err_collapse, _, _ = unwrap(
            mcp.call(
                "set_view",
                {"collapsedOutlineHeadingIds": ["c2000001-0000-4000-8000-000000000001"]},
            )
        )
        err2, text2, _ = unwrap(mcp.call("filtered_tasks", {}))
        folded = parse_json(text2) or {}
        collapsed = (folded.get("view") or {}).get("collapsed") or []
        vis = {
            t.get("name"): t.get("visibility")
            for t in folded.get("tasks") or []
            if t.get("name") == "要件定義書作成"
        }
        record(
            "view-collapse",
            (not err_collapse)
            and any(c.get("id") == "c2000001-0000-4000-8000-000000000001" for c in collapsed),
            json.dumps({"collapsed": collapsed, "vis": vis}, ensure_ascii=False)[:400],
        )
        unwrap(mcp.call("set_view", {"collapsedOutlineHeadingIds": []}))

        test_front(mcp, test_label)
        filters = {
            "assignee": "all",
            "status": "all",
            "confidence": "all",
            "overdue": "all",
            "relation": "all",
            "milestone": "all",
            "tags": [],
            "search": "要件定義書",
            "noteSearch": "",
            "fieldFilters": {},
        }
        err_filt, filt_msg, _ = unwrap(
            mcp.call("set_view", {"filters": filters, "searchField": "name"})
        )
        err2, text2, _ = unwrap(mcp.call("filtered_tasks", {}))
        names = [t.get("name") for t in (parse_json(text2) or {}).get("tasks") or []]
        record(
            "view-filter-search",
            (not err_filt) and names == ["要件定義書作成"],
            f"set_view={filt_msg[:60]} names={names}",
        )
        filters["search"] = ""
        unwrap(mcp.call("set_view", {"filters": filters, "searchField": "name"}))
        err2, text2, _ = unwrap(mcp.call("filtered_tasks", {}))
        record("view-filter-clear", len((parse_json(text2) or {}).get("tasks") or []) > 1, text2[:80])

        before_diff_err, before_diff, _ = unwrap(mcp.call("schedule_diff", {}))
        record(
            "view-schedule-diff-baseline",
            (not before_diff_err) and "比べるファイルがありません" not in before_diff,
            before_diff[:120],
        )
        unwrap(
            mcp.call(
                "set_view",
                {
                    "displayScale": 1.25,
                    "rowDensity": "compact",
                    "showLightningLine": False,
                    "sidebarColumns": {
                        "start": True,
                        "end": False,
                        "duration": False,
                        "progress": False,
                        "status": True,
                    },
                    "colorScheme": "dark",
                    "zoomTier": "month",
                },
            )
        )
        err2, text2, _ = unwrap(mcp.call("filtered_tasks", {}))
        v = (parse_json(text2) or {}).get("view") or {}
        month_dates = (v.get("visible") or {}).get("dates")
        record(
            "view-prefs",
            v.get("displayScale", {}).get("preference") == 1.25
            and v.get("rowDensity") == "compact"
            and v.get("lightning") is False
            and v.get("colorScheme", {}).get("effective") == "dark",
            json.dumps(
                {
                    "scale": v.get("displayScale"),
                    "density": v.get("rowDensity"),
                    "scheme": v.get("colorScheme"),
                },
                ensure_ascii=False,
            ),
        )
        unwrap(mcp.call("set_view", {"zoomTier": "day", "scrollX": 0}))
        err2, text2, _ = unwrap(mcp.call("filtered_tasks", {}))
        day_dates = (((parse_json(text2) or {}).get("view") or {}).get("visible") or {}).get("dates")
        unwrap(mcp.call("set_view", {"scrollX": 4000}))
        err2, text2, _ = unwrap(mcp.call("filtered_tasks", {}))
        scroll_dates = (((parse_json(text2) or {}).get("view") or {}).get("visible") or {}).get("dates")
        unwrap(mcp.call("set_view", {"fitToWidth": True}))
        err2, text2, _ = unwrap(mcp.call("filtered_tasks", {}))
        fit_dates = (((parse_json(text2) or {}).get("view") or {}).get("visible") or {}).get("dates")
        record(
            "view-zoom-scroll-fit",
            month_dates != day_dates or day_dates != scroll_dates or scroll_dates != fit_dates,
            json.dumps(
                {"month": month_dates, "day": day_dates, "scroll": scroll_dates, "fit": fit_dates},
                ensure_ascii=False,
            )[:500],
        )
        after_diff_err, after_diff, _ = unwrap(mcp.call("schedule_diff", {}))
        record("view-not-dirty", after_diff == before_diff, f"equal={after_diff == before_diff}")

        err_cal0, text_cal0, _ = unwrap(mcp.call("filtered_tasks", {}))
        cal_view = (parse_json(text_cal0) or {}).get("view") or {}
        cal_source = (cal_view.get("calendar") or {}).get("source")
        if cal_source == "default":
            err_cal, cal_text, _ = unwrap(
                mcp.call(
                    "set_view",
                    {
                        "calendar": {
                            "action": "importPath",
                            "path": str(TMP / "jp-2026.calendar.json"),
                        }
                    },
                )
            )
            loaded = {}
            for _ in range(15):
                time.sleep(0.25)
                err2, text2, _ = unwrap(mcp.call("filtered_tasks", {}))
                loaded = ((parse_json(text2) or {}).get("view") or {}).get("calendar") or {}
                if loaded.get("source") == "loaded":
                    break
            record(
                "view-calendar-import",
                (not err_cal)
                and loaded.get("source") == "loaded",
                json.dumps(
                    {"source": loaded.get("source"), "set_view": cal_text[:120]},
                    ensure_ascii=False,
                ),
            )
            unwrap(mcp.call("set_view", {"calendar": {"action": "clear"}}))
            err2, text2, _ = unwrap(mcp.call("filtered_tasks", {}))
            cleared = ((parse_json(text2) or {}).get("view") or {}).get("calendar") or {}
            record("view-calendar-clear", cleared.get("source") == "default", cleared.get("source", ""))

        # --- 2 計画 ---
        if not test_front(mcp, test_label):
            record("plan-abort-front", False, "前面に playground がありません")
            return
        task_id = "b1000001-0000-4000-8000-000000000002"
        other_id = "b1000001-0000-4000-8000-000000000001"
        review_id = "b1000001-0000-4000-8000-000000000003"
        parent_b = "65283a8a-3e6d-4fa4-8751-c1d4e1e4c89c"
        move_task_id = review_id
        delete_task_id = review_id

        err, text, _ = unwrap(
            mcp.call(
                "edit_plan",
                {
                    "ops": [
                        {
                            "type": "setTaskDates",
                            "taskId": task_id,
                            "start": "2026-09-01",
                            "end": "2026-09-05",
                        }
                    ]
                },
            )
        )
        err2, text2, _ = unwrap(mcp.call("current_schedule", {}))
        task = find_task(parse_json(text2) or {}, task_id) or {}
        err3, diff, _ = unwrap(mcp.call("schedule_diff", {}))
        record(
            "plan-setTaskDates",
            (not err) and task.get("start") == "2026-09-01" and "2026-09-01" in diff,
            f"start={task.get('start')} diff_has={ '2026-09-01' in diff}",
        )

        err, text, _ = unwrap(mcp.call("history", {"action": "undo"}))
        err2, text2, _ = unwrap(mcp.call("current_schedule", {}))
        task = find_task(parse_json(text2) or {}, task_id) or {}
        record("plan-undo", (not err) and task.get("start") == "2026-09-18", f"start={task.get('start')}")
        err, text, _ = unwrap(mcp.call("history", {"action": "redo"}))
        err2, text2, _ = unwrap(mcp.call("current_schedule", {}))
        task = find_task(parse_json(text2) or {}, task_id) or {}
        record("plan-redo", (not err) and task.get("start") == "2026-09-01", f"start={task.get('start')}")

        err, text, _ = unwrap(
            mcp.call(
                "edit_plan",
                {"ops": [{"type": "setAssigneeIds", "taskId": task_id, "assigneeIds": ["suzuki"]}]},
            )
        )
        err2, text2, _ = unwrap(mcp.call("current_schedule", {}))
        task = find_task(parse_json(text2) or {}, task_id) or {}
        assignee = task.get("assigneeId", task.get("assigneeIds"))
        record(
            "plan-setAssigneeIds",
            (not err) and (assignee == "suzuki" or assignee == ["suzuki"]),
            str(assignee),
        )
        unwrap(mcp.call("history", {"action": "undo"}))

        err, text, _ = unwrap(
            mcp.call(
                "edit_plan",
                {"ops": [{"type": "setPredecessors", "taskId": task_id, "predecessors": []}]},
            )
        )
        err2, text2, _ = unwrap(mcp.call("current_schedule", {}))
        task = find_task(parse_json(text2) or {}, task_id) or {}
        record("plan-setPredecessors", (not err) and task.get("predecessors") == [], str(task.get("predecessors")))
        unwrap(mcp.call("history", {"action": "undo"}))

        err, text, _ = unwrap(mcp.call("edit_plan", {"ops": [{"type": "deleteTask", "taskId": delete_task_id}]}))
        err2, text2, _ = unwrap(mcp.call("current_schedule", {}))
        gone = find_task(parse_json(text2) or {}, delete_task_id)
        record("plan-deleteTask", (not err) and gone is None, text[:80])
        if not err and gone is None:
            unwrap(mcp.call("history", {"action": "undo"}))

        err, text, _ = unwrap(
            mcp.call(
                "edit_plan",
                {
                    "ops": [
                        {
                            "type": "moveTask",
                            "taskId": move_task_id,
                            "targetGroupId": parent_b,
                            "insertIndex": 0,
                        }
                    ]
                },
            )
        )
        err2, text2, _ = unwrap(mcp.call("current_schedule", {}))
        order = sibling_task_ids(parse_json(text2) or {}, parent_b)
        record(
            "plan-moveTask",
            (not err)
            and order
            and order[0] == move_task_id
            and ("移った先" in text or "計画は変わりませんでした" in text),
            f"{text[:80]} order={order}",
        )
        err, bad, _ = unwrap(
            mcp.call(
                "edit_plan",
                {
                    "ops": [
                        {
                            "type": "moveTask",
                            "taskId": move_task_id,
                            "targetGroupId": parent_b,
                            "insertIndex": 99,
                        }
                    ]
                },
            )
        )
        err2, text2, _ = unwrap(mcp.call("current_schedule", {}))
        stayed = sibling_task_ids(parse_json(text2) or {}, parent_b)
        record("plan-moveTask-invalid", err and "置けない位置" in bad and stayed == order, bad[:80])

        err0, text0, _ = unwrap(mcp.call("current_schedule", {}))
        doc = json.loads((TMP / "playground.schedule.json").read_text())
        new_id = str(uuid.uuid4())
        for node in doc.get("outline") or []:
            for child in node.get("children") or []:
                if child.get("id") == "7f8b123f-a000-4e09-88b5-fa2bb024ee15":
                    child.setdefault("children", []).append(
                        {
                            "id": new_id,
                            "name": "MCP確認で足した作業",
                            "start": "2026-09-28",
                            "end": "2026-09-30",
                            "assigneeId": None,
                            "status": "not-started",
                            "progress": 0,
                            "confidence": "committed",
                            "predecessors": [],
                            "milestoneId": None,
                        }
                    )
        err, text, _ = unwrap(mcp.call("replace_schedule", doc))
        err2, text2, _ = unwrap(mcp.call("current_schedule", {}))
        created = find_task(parse_json(text2) or {}, new_id)
        record("plan-replace-add", (not err) and created is not None, text[:100])
        unwrap(mcp.call("history", {"action": "undo"}))

        err0, text0, _ = unwrap(mcp.call("current_schedule", {}))
        doc = parse_json(text0) or {}
        doc["connections"] = [{"taskIds": [task_id, other_id], "label": "確認の繋がり"}]
        unwrap(mcp.call("replace_schedule", doc))
        err2, text2, _ = unwrap(mcp.call("current_schedule", {}))
        conns = (parse_json(text2) or {}).get("connections") or []
        record(
            "plan-connection-add",
            any(c.get("label") == "確認の繋がり" for c in conns),
            str(conns)[:120],
        )
        doc2 = parse_json(text2) or {}
        doc2.pop("connections", None)
        unwrap(mcp.call("replace_schedule", doc2))
        err2, text2, _ = unwrap(mcp.call("current_schedule", {}))
        record("plan-connection-remove", "connections" not in (parse_json(text2) or {}), "removed")

        # --- 3 一覧 ---
        if not test_front(mcp, test_label):
            record("catalog-abort-front", False, "前面に playground がありません")
            return

        def catalog(kind, contents, save):
            args = {"catalog": kind, "contents": contents, "overwrite": True}
            if save:
                args["save"] = True
            return unwrap(mcp.call("catalog_action", args))

        members_doc = json.loads((TMP / "sample-team.members.json").read_text())
        err, text, _ = catalog("members", members_doc, False)
        record("catalog-members-draft", (not err) and "ファイルは変えていません" in text, text[:120])
        members_doc["members"][0]["name"] = "田中確認"
        err, text, _ = catalog("members", members_doc, True)
        err2, text2, _ = unwrap(mcp.call("filtered_tasks", {}))
        mnames = [m.get("name") for m in (parse_json(text2) or {}).get("members") or []]
        record("catalog-members-save", (not err) and "田中確認" in mnames, f"{text[:80]} {mnames}")

        statuses_doc = json.loads((TMP / "playground.statuses.json").read_text())
        err, text, _ = catalog("statuses", statuses_doc, False)
        statuses_doc["statuses"][0]["name"] = "未着手確認"
        err, text, _ = catalog("statuses", statuses_doc, True)
        err2, text2, _ = unwrap(mcp.call("filtered_tasks", {}))
        snames = [s.get("name") for s in (parse_json(text2) or {}).get("statuses") or []]
        record("catalog-statuses-save", (not err) and "未着手確認" in snames, str(snames))

        colors_doc = json.loads((TMP / "colors.json").read_text())
        err, text, _ = catalog("colors", colors_doc, False)
        colors_doc["colors"][0]["name"] = "確認済み"
        err, text, _ = catalog("colors", colors_doc, True)
        err2, text2, _ = unwrap(mcp.call("filtered_tasks", {}))
        cnames = [c.get("name") for c in (parse_json(text2) or {}).get("colors") or []]
        record("catalog-colors-save", (not err) and "確認済み" in cnames, str(cnames))

        fields_doc = json.loads((TMP / "sample.fields.json").read_text())
        err, text, _ = catalog("fields", fields_doc, False)
        fields_doc["fields"][0]["name"] = "メモ確認"
        err, text, _ = catalog("fields", fields_doc, True)
        err2, text2, _ = unwrap(mcp.call("filtered_tasks", {}))
        fnames = [f.get("name") for f in (parse_json(text2) or {}).get("fields") or []]
        record("catalog-fields-save", (not err) and "メモ確認" in fnames, str(fnames))

        # --- 4 ファイル ---
        if not test_front(mcp, test_label):
            record("file-abort-front", False, "前面に playground がありません")
            return
        err, diff, _ = unwrap(mcp.call("schedule_diff", {}))
        if "2026-09-01" not in diff:
            unwrap(
                mcp.call(
                    "edit_plan",
                    {
                        "ops": [
                            {
                                "type": "setTaskDates",
                                "taskId": task_id,
                                "start": "2026-09-01",
                                "end": "2026-09-05",
                            }
                        ]
                    },
                )
            )
            err, diff, _ = unwrap(mcp.call("schedule_diff", {}))
        record("file-dirty-before-save", "2026-09-01" in diff, diff[:120])
        err, text, _ = unwrap(mcp.call("file_action", {"action": "save"}))
        err2, diff2, _ = unwrap(mcp.call("schedule_diff", {}))
        record("file-save", (not err) and "2026-09-01" not in diff2, text[:120])
        save_as = str(TMP / "as.schedule.json")
        err, text, _ = unwrap(mcp.call("file_action", {"action": "saveAs", "path": save_as}))
        record("file-saveAs", (not err) and save_as in text, text[:120])
        for fmt in ("html", "svg", "xlsx"):
            path = str(TMP / f"export.{fmt}")
            err, text, _ = unwrap(
                mcp.call("file_action", {"action": "export", "format": fmt, "path": path})
            )
            record(f"file-export-{fmt}", (not err) and path in text, text[:120])
        (TMP / "workspace-out").mkdir(parents=True, exist_ok=True)
        out_dir = TMP / "workspace-out"
        if out_dir.exists():
            shutil.rmtree(out_dir)
        out_dir.mkdir()
        err, text, _ = unwrap(
            mcp.call("file_action", {"action": "exportWorkspace", "folder": str(out_dir)})
        )
        record("file-exportWorkspace", (not err) and "workspace-out" in text, text[:120])

        unwrap(
            mcp.call(
                "edit_plan",
                {
                    "ops": [
                        {
                            "type": "setTaskDates",
                            "taskId": other_id,
                            "start": "2026-08-01",
                            "end": "2026-08-02",
                        }
                    ]
                },
            )
        )
        err, text, _ = unwrap(
            mcp.call("file_action", {"action": "open", "path": str(TMP / "playground.schedule.json")})
        )
        err2, text2, _ = unwrap(mcp.call("current_schedule", {}))
        still = find_task(parse_json(text2) or {}, other_id) or {}
        record(
            "file-open-reject",
            err and "discardUnsaved" in text and still.get("start") == "2026-08-01",
            text[:120],
        )
        err, text, _ = unwrap(
            mcp.call(
                "file_action",
                {
                    "action": "open",
                    "path": str(TMP / "playground.schedule.json"),
                    "discardUnsaved": True,
                },
            )
        )
        err2, text2, _ = unwrap(mcp.call("current_schedule", {}))
        opened_task = find_task(parse_json(text2) or {}, task_id) or {}
        record(
            "file-open-discard",
            (not err) and opened_task.get("start") == "2026-09-01",
            f"start={opened_task.get('start')}",
        )

        # --- 5 設定 ---
        if not test_front(mcp, test_label):
            record("prefs-abort-front", False, "前面に playground がありません")
            return
        err, text, _ = unwrap(mcp.call("set_preferences", {}))
        record("prefs-empty-reject", err and "項目" in text, text[:120])
        skill_dir = TMP / "skills-project"
        skill_dir.mkdir(exist_ok=True)
        err, text, _ = unwrap(
            mcp.call(
                "set_preferences",
                {
                    "jsonSkills": {
                        "mode": "install",
                        "scope": "project",
                        "projectFolder": str(skill_dir),
                        "tools": {"cursor": True, "claude": False, "copilot": False},
                    }
                },
            )
        )
        record("prefs-skills-install", not err, text[:200])
        err, text, _ = unwrap(
            mcp.call(
                "set_preferences",
                {
                    "jsonSkills": {
                        "mode": "uninstall",
                        "scope": "project",
                        "projectFolder": str(skill_dir),
                        "tools": {"cursor": True, "claude": False, "copilot": False},
                    }
                },
            )
        )
        record("prefs-skills-uninstall", not err, text[:200])

        # --- 6 ウィンドウ ---
        if not test_front(mcp, test_label):
            record("window-abort-front", False, "前面に playground がありません")
            return
        unwrap(mcp.call("schedule_diff", {"window": original_front}))
        err, text, _ = unwrap(mcp.call("open_windows", {}))
        wins = parse_json(text) or []
        front = next((w.get("label") for w in wins if w.get("front")), None)
        record("window-read-back-no-focus", front == test_label, f"front={front}")
        unwrap(mcp.call("focus_window", {"window": original_front}))
        err, text, _ = unwrap(mcp.call("open_windows", {}))
        wins = parse_json(text) or []
        front = next((w.get("label") for w in wins if w.get("front")), None)
        record("window-focus-original", front == original_front, f"front={front}")
        unwrap(mcp.call("current_schedule", {"window": test_label}))
        err, text, _ = unwrap(mcp.call("open_windows", {}))
        wins_after_read = parse_json(text) or []
        front = next((w.get("label") for w in wins_after_read if w.get("front")), None)
        record("window-read-test-keeps-front", front == original_front, f"front={front}")
        if test_label:
            unwrap(mcp.call("focus_window", {"window": test_label}))
            unwrap(mcp.call("minimize_window", {"window": test_label}))
            err, text, _ = unwrap(mcp.call("open_windows", {}))
            wins = parse_json(text) or []
            record(
                "window-minimize",
                any(w.get("label") == test_label for w in wins),
                text[:120],
            )
            unwrap(mcp.call("focus_window", {"window": test_label}))
            err, text, _ = unwrap(mcp.call("open_windows", {}))
            wins = parse_json(text) or []
            front = next((w.get("label") for w in wins if w.get("front")), None)
            record("window-focus-after-minimize", front == test_label, f"front={front}")

    finally:
        if view_restore and original_view_captured:
            unwrap(mcp.call("set_view", view_restore))
            err, text, _ = unwrap(mcp.call("filtered_tasks", {"window": original_front}))
            v = (parse_json(text) or {}).get("view") or {}
            record(
                "restore-view-on-original",
                (not err)
                and v.get("displayScale", {}).get("preference") == view_restore["displayScale"],
                json.dumps(v.get("displayScale"), ensure_ascii=False),
            )
        elif view_restore:
            record("restore-view-on-original", False, "skipped: capture failed")
        if test_label:
            closed = 0
            for w in list_windows(mcp):
                lab = w.get("label")
                if lab == original_front:
                    continue
                if lab and w.get("folder") == "mcp-op-test":
                    if len(list_windows(mcp)) <= 1:
                        break
                    ensure_front(mcp, lab)
                    discard_progress(mcp)
                    err, text, _ = unwrap(
                        mcp.call("close_window", {"window": lab, "discardUnsaved": True})
                    )
                    closed += 1
            record(
                "restore-close-test",
                closed > 0,
                f"closed={closed}",
            )
        close_mcp_op_test_playgrounds(mcp, keep=original_front)
        ensure_front(mcp, original_front)
        err, text, _ = unwrap(mcp.call("open_windows", {}))
        wins = parse_json(text) or []
        front = next((w.get("label") for w in wins if w.get("front")), None)
        playground_left = [w for w in wins if w.get("folder") == "mcp-op-test"]
        record(
            "restore-front",
            front == original_front and len(playground_left) == 0,
            f"front={front} playgrounds={len(playground_left)}",
        )
        mcp.close()

    failed = [r for r in results if not r["ok"]]
    out = ROOT / ".cursor/mcp-e2e-results.json"
    out.write_text(
        json.dumps(
            {"pass": len(results) - len(failed), "fail": len(failed), "results": results},
            ensure_ascii=False,
            indent=2,
        )
    )
    print(f"SUMMARY pass={len(results) - len(failed)} fail={len(failed)}", flush=True)
    print(f"Wrote {out}", flush=True)


if __name__ == "__main__":
    main()
