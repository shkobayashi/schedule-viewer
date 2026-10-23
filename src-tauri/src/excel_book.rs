//! 書き出した xlsx の XML を読み、図形の契約をテストする。

use std::io::{Cursor, Read};

use zip::ZipArchive;

pub const EMU_PER_PX: u64 = 9525;

pub fn read_zip_entry(bytes: &[u8], name: &str) -> Option<String> {
    let cursor = Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor).ok()?;
    let mut file = archive.by_name(name).ok()?;
    let mut xml = String::new();
    file.read_to_string(&mut xml).ok()?;
    Some(xml)
}

pub fn drawing_xml(bytes: &[u8]) -> String {
    read_zip_entry(bytes, "xl/drawings/drawing1.xml")
        .expect("xl/drawings/drawing1.xml")
}

pub fn sheet_xml(bytes: &[u8]) -> String {
    read_zip_entry(bytes, "xl/worksheets/sheet1.xml")
        .expect("xl/worksheets/sheet1.xml")
}

pub fn shared_strings_xml(bytes: &[u8]) -> Option<String> {
    read_zip_entry(bytes, "xl/sharedStrings.xml")
}

pub fn workbook_contains_text(bytes: &[u8], text: &str) -> bool {
    if let Some(shared) = shared_strings_xml(bytes) {
        if shared.contains(text) {
            return true;
        }
    }
    sheet_xml(bytes).contains(text)
}

fn parse_u32_tag(block: &str, tag: &str) -> Option<u32> {
    let open = format!("<{tag}>");
    let close = format!("</{tag}>");
    let start = block.find(&open)? + open.len();
    let end = block[start..].find(&close)? + start;
    block[start..end].trim().parse().ok()
}

fn parse_u64_tag(block: &str, tag: &str) -> Option<u64> {
    let open = format!("<{tag}>");
    let close = format!("</{tag}>");
    let start = block.find(&open)? + open.len();
    let end = block[start..].find(&close)? + start;
    block[start..end].trim().parse().ok()
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TwoCellAnchor {
    pub from_col: u32,
    pub from_row: u32,
    pub from_col_off: u64,
    pub from_row_off: u64,
    pub to_col: u32,
    pub to_row: u32,
    pub to_col_off: u64,
    pub to_row_off: u64,
    pub is_bar: bool,
    pub is_connector: bool,
    pub is_line: bool,
    pub bent_connector: bool,
    pub straight_connector: bool,
    pub dotted_pattern: bool,
    pub st_cxn_idx3: bool,
    pub end_cxn_idx1: bool,
    pub triangle_tail: bool,
}

pub fn parse_two_cell_anchors(drawing_xml: &str) -> Vec<TwoCellAnchor> {
    let mut anchors = Vec::new();
    let mut pos = 0usize;
    while let Some(rel) = drawing_xml[pos..].find("<xdr:twoCellAnchor") {
        let abs = pos + rel;
        let end_rel = drawing_xml[abs..]
            .find("</xdr:twoCellAnchor>")
            .map(|e| abs + e + "</xdr:twoCellAnchor>".len());
        let end = end_rel.unwrap_or(drawing_xml.len());
        let chunk = &drawing_xml[abs..end];
        let Some(from_rel) = chunk.find("<xdr:from>") else {
            pos = end;
            continue;
        };
        let from_start = from_rel + "<xdr:from>".len();
        let from_end = chunk[from_start..]
            .find("</xdr:from>")
            .map(|i| from_start + i)
            .unwrap_or(from_start);
        let Some(to_rel) = chunk.find("<xdr:to>") else {
            pos = end;
            continue;
        };
        let to_start = to_rel + "<xdr:to>".len();
        let to_end = chunk[to_start..]
            .find("</xdr:to>")
            .map(|i| to_start + i)
            .unwrap_or(to_start);
        let from_block = &chunk[from_start..from_end];
        let to_block = &chunk[to_start..to_end];
        anchors.push(TwoCellAnchor {
            from_col: parse_u32_tag(from_block, "xdr:col").unwrap_or(0),
            from_row: parse_u32_tag(from_block, "xdr:row").unwrap_or(0),
            from_col_off: parse_u64_tag(from_block, "xdr:colOff").unwrap_or(0),
            from_row_off: parse_u64_tag(from_block, "xdr:rowOff").unwrap_or(0),
            to_col: parse_u32_tag(to_block, "xdr:col").unwrap_or(0),
            to_row: parse_u32_tag(to_block, "xdr:row").unwrap_or(0),
            to_col_off: parse_u64_tag(to_block, "xdr:colOff").unwrap_or(0),
            to_row_off: parse_u64_tag(to_block, "xdr:rowOff").unwrap_or(0),
            is_bar: chunk.contains("<xdr:sp") && !chunk.contains("<xdr:cxnSp"),
            is_connector: chunk.contains("<xdr:cxnSp"),
            is_line: chunk.contains("prst=\"line\""),
            bent_connector: chunk.contains("bentConnector3"),
            straight_connector: chunk.contains("straightConnector1"),
            dotted_pattern: chunk.contains("pct20") || chunk.contains("Dotted20Percent"),
            st_cxn_idx3: chunk.contains("idx=\"3\""),
            end_cxn_idx1: chunk.contains("idx=\"1\""),
            triangle_tail: chunk.contains("type=\"triangle\""),
        });
        pos = end;
    }
    anchors
}

pub fn emu(px: u32) -> u64 {
    u64::from(px) * EMU_PER_PX
}

pub fn anchor_from_inner(block: &str) -> Option<String> {
    let start = block.find("<xdr:from>")? + "<xdr:from>".len();
    let end = block[start..].find("</xdr:from>")? + start;
    Some(block[start..end].to_string())
}

pub fn anchor_to_inner(block: &str) -> Option<String> {
    let start = block.find("<xdr:to>")? + "<xdr:to>".len();
    let end = block[start..].find("</xdr:to>")? + start;
    Some(block[start..end].to_string())
}

fn parse_attr_u32(block: &str, attr: &str) -> Option<u32> {
    let needle = format!("{attr}=\"");
    let start = block.find(&needle)? + needle.len();
    let end = block[start..].find('"')? + start;
    block[start..end].parse().ok()
}

pub fn parse_ext_cx_cy(block: &str) -> Option<(u64, u64)> {
    let pos = block.find("<a:ext ")?;
    let chunk = &block[pos..];
    let cx = parse_attr_u32(chunk, "cx")? as u64;
    let cy = parse_attr_u32(chunk, "cy")? as u64;
    Some((cx, cy))
}

pub fn connector_st_cxn_idx(block: &str) -> Option<u32> {
    let start = block.find("<a:stCxn")?;
    let end = block[start..].find("/>")? + start + 2;
    parse_attr_u32(&block[start..end], "idx")
}

pub fn connector_end_cxn_idx(block: &str) -> Option<u32> {
    let start = block.find("<a:endCxn")?;
    let end = block[start..].find("/>")? + start + 2;
    parse_attr_u32(&block[start..end], "idx")
}

pub fn connector_flip_h_v(block: &str) -> (bool, bool) {
    let flip_h = block.contains("flipH=\"1\"");
    let flip_v = block.contains("flipV=\"1\"");
    (flip_h, flip_v)
}

pub fn bar_anchor_blocks(drawing_xml: &str) -> Vec<String> {
    let mut blocks = Vec::new();
    let mut pos = 0usize;
    while let Some(rel) = drawing_xml[pos..].find("<xdr:twoCellAnchor") {
        let abs = pos + rel;
        let end_rel = drawing_xml[abs..]
            .find("</xdr:twoCellAnchor>")
            .map(|e| abs + e + "</xdr:twoCellAnchor>".len());
        let end = end_rel.unwrap_or(drawing_xml.len());
        let chunk = drawing_xml[abs..end].to_string();
        if chunk.contains("<xdr:sp") && !chunk.contains("<xdr:cxnSp") {
            blocks.push(chunk);
        }
        pos = end;
    }
    blocks
}

pub fn connector_anchor_blocks(drawing_xml: &str) -> Vec<String> {
    let mut blocks = Vec::new();
    let mut pos = 0usize;
    while let Some(rel) = drawing_xml[pos..].find("<xdr:twoCellAnchor") {
        let abs = pos + rel;
        let end_rel = drawing_xml[abs..]
            .find("</xdr:twoCellAnchor>")
            .map(|e| abs + e + "</xdr:twoCellAnchor>".len());
        let end = end_rel.unwrap_or(drawing_xml.len());
        let chunk = drawing_xml[abs..end].to_string();
        if chunk.contains("<xdr:cxnSp") {
            blocks.push(chunk);
        }
        pos = end;
    }
    blocks
}

pub fn line_anchor_blocks(drawing_xml: &str) -> Vec<String> {
    let mut blocks = Vec::new();
    let mut pos = 0usize;
    while let Some(rel) = drawing_xml[pos..].find("<xdr:twoCellAnchor") {
        let abs = pos + rel;
        let end_rel = drawing_xml[abs..]
            .find("</xdr:twoCellAnchor>")
            .map(|e| abs + e + "</xdr:twoCellAnchor>".len());
        let end = end_rel.unwrap_or(drawing_xml.len());
        let chunk = drawing_xml[abs..end].to_string();
        if chunk.contains("prst=\"line\"") {
            blocks.push(chunk);
        }
        pos = end;
    }
    blocks
}

pub fn milestone_merge_refs(sheet: &str) -> Vec<String> {
    let mut refs = Vec::new();
    let mut pos = 0usize;
    while let Some(rel) = sheet[pos..].find("mergeCell ref=\"") {
        let abs = pos + rel + "mergeCell ref=\"".len();
        let end = abs + sheet[abs..].find('"').unwrap_or(sheet.len());
        let reference = sheet[abs..end].to_string();
        if !reference.starts_with("A1:") {
            refs.push(reference);
        }
        pos = end;
    }
    refs
}

pub fn anchor_block_xml(drawing_xml: &str, index: usize) -> Option<String> {
    let mut pos = 0usize;
    let mut count = 0usize;
    while let Some(rel) = drawing_xml[pos..].find("<xdr:twoCellAnchor") {
        let abs = pos + rel;
        let end_rel = drawing_xml[abs..]
            .find("</xdr:twoCellAnchor>")
            .map(|e| abs + e + "</xdr:twoCellAnchor>".len());
        let end = end_rel?;
        let chunk = drawing_xml[abs..end].to_string();
        if count == index {
            return Some(chunk);
        }
        count += 1;
        pos = end;
    }
    None
}
