use std::collections::HashMap;
use std::io::{Cursor, Read, Write};

use zip::read::ZipArchive;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

use crate::export_xlsx::{
    ExcelExportConnectionCurve, ExcelExportConnector, ExcelExportPayload,
    ExcelExportSummaryCap, ExcelExportSummaryGapLine, ExcelExportTodayLine,
};

const EMU_PER_PX: u64 = 9525;
const CONNECTOR_STYLE: &str = r#"<xdr:style><a:lnRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:lnRef><a:fillRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:fillRef><a:effectRef idx="0"><a:scrgbClr r="0" g="0" b="0"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></xdr:style>"#;

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct AnchorCorner {
    col: u32,
    row: u32,
    col_off: u64,
    row_off: u64,
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

fn parse_anchor(block: &str) -> Option<AnchorCorner> {
    Some(AnchorCorner {
        col: parse_u32_tag(block, "xdr:col")?,
        row: parse_u32_tag(block, "xdr:row")?,
        col_off: parse_u64_tag(block, "xdr:colOff")?,
        row_off: parse_u64_tag(block, "xdr:rowOff")?,
    })
}

fn anchor_from_xml(block: &str) -> Option<String> {
    let start = block.find("<xdr:from>")? + "<xdr:from>".len();
    let end = block[start..].find("</xdr:from>")? + start;
    Some(block[start..end].to_string())
}

fn anchor_to_xml(block: &str) -> Option<String> {
    let start = block.find("<xdr:to>")? + "<xdr:to>".len();
    let end = block[start..].find("</xdr:to>")? + start;
    Some(block[start..end].to_string())
}

fn format_anchor(corner: AnchorCorner) -> String {
    format!(
        "<xdr:col>{}</xdr:col><xdr:colOff>{}</xdr:colOff><xdr:row>{}</xdr:row><xdr:rowOff>{}</xdr:rowOff>",
        corner.col,
        corner.col_off,
        corner.row,
        corner.row_off,
    )
}

fn emu_per_body_row(body_row_height_px: u32) -> u64 {
    u64::from(body_row_height_px.max(1)) * EMU_PER_PX
}

fn row_y(corner: AnchorCorner, body_row_height_emu: u64) -> u64 {
    corner.row as u64 * body_row_height_emu + corner.row_off
}

fn y_to_row_off(y: u64, body_row_height_emu: u64) -> (u32, u64) {
    let row = (y / body_row_height_emu) as u32;
    let row_off = y % body_row_height_emu;
    (row, row_off)
}

fn shape_vertical_mid(
    top: AnchorCorner,
    bottom: AnchorCorner,
    body_row_height_emu: u64,
) -> (u32, u64) {
    let mid = (row_y(top, body_row_height_emu) + row_y(bottom, body_row_height_emu)) / 2;
    y_to_row_off(mid, body_row_height_emu)
}

fn right_edge_center(
    top: AnchorCorner,
    bottom: AnchorCorner,
    body_row_height_emu: u64,
) -> AnchorCorner {
    let (row, row_off) = shape_vertical_mid(top, bottom, body_row_height_emu);
    AnchorCorner {
        col: bottom.col,
        col_off: bottom.col_off,
        row,
        row_off,
    }
}

fn left_edge_center(
    top: AnchorCorner,
    bottom: AnchorCorner,
    body_row_height_emu: u64,
) -> AnchorCorner {
    let (row, row_off) = shape_vertical_mid(top, bottom, body_row_height_emu);
    AnchorCorner {
        col: top.col,
        col_off: top.col_off,
        row,
        row_off,
    }
}

fn x_in_date_area_to_corner(
    x: u64,
    left_count: u32,
    date_col_width_emu: u64,
    row: u32,
    row_off: u64,
) -> AnchorCorner {
    let w = date_col_width_emu.max(1);
    let col_delta = (x / w) as u32;
    AnchorCorner {
        col: left_count + col_delta,
        col_off: x % w,
        row,
        row_off,
    }
}

fn top_edge_center(
    top_left: AnchorCorner,
    bottom_right: AnchorCorner,
    left_count: u32,
    date_col_width_emu: u64,
) -> AnchorCorner {
    let w = date_col_width_emu.max(1);
    let x_left = (top_left.col.saturating_sub(left_count)) as u64 * w + top_left.col_off;
    let x_right =
        (bottom_right.col.saturating_sub(left_count)) as u64 * w + bottom_right.col_off;
    let x_mid = (x_left + x_right) / 2;
    x_in_date_area_to_corner(x_mid, left_count, w, top_left.row, top_left.row_off)
}

fn horizontal_cmp(a: AnchorCorner, b: AnchorCorner) -> std::cmp::Ordering {
    a.col
        .cmp(&b.col)
        .then_with(|| a.col_off.cmp(&b.col_off))
}

fn connector_bounds(
    start: AnchorCorner,
    end: AnchorCorner,
    body_row_height_emu: u64,
) -> (AnchorCorner, AnchorCorner) {
    let (left_col, left_off, right_col, right_off) =
        if horizontal_cmp(start, end) != std::cmp::Ordering::Greater {
            (start.col, start.col_off, end.col, end.col_off)
        } else {
            (end.col, end.col_off, start.col, start.col_off)
        };
    let sy = row_y(start, body_row_height_emu);
    let ey = row_y(end, body_row_height_emu);
    let (top_y, bottom_y) = if sy <= ey { (sy, ey) } else { (ey, sy) };
    let (top_row, top_off) = y_to_row_off(top_y, body_row_height_emu);
    let (bottom_row, bottom_off) = y_to_row_off(bottom_y, body_row_height_emu);
    (
        AnchorCorner {
            col: left_col,
            col_off: left_off,
            row: top_row,
            row_off: top_off,
        },
        AnchorCorner {
            col: right_col,
            col_off: right_off,
            row: bottom_row,
            row_off: bottom_off,
        },
    )
}

fn connector_anchors_from_shapes(
    from_a: &str,
    to_a: &str,
    from_b: &str,
    to_b: &str,
    body_row_height_emu: u64,
) -> Option<(String, String, bool, bool)> {
    let a_from = parse_anchor(from_a)?;
    let a_to = parse_anchor(to_a)?;
    let b_from = parse_anchor(from_b)?;
    let b_to = parse_anchor(to_b)?;
    let start = right_edge_center(a_from, a_to, body_row_height_emu);
    let end = left_edge_center(b_from, b_to, body_row_height_emu);
    let flip_h = horizontal_cmp(end, start) == std::cmp::Ordering::Less;
    let flip_v = row_y(end, body_row_height_emu) < row_y(start, body_row_height_emu);
    let (from, to) = connector_bounds(start, end, body_row_height_emu);
    Some((
        format_anchor(from),
        format_anchor(to),
        flip_h,
        flip_v,
    ))
}

fn shape_anchor_blocks(drawing_xml: &str, shape_index: usize) -> Option<(String, String)> {
    let mut pos = 0usize;
    let mut count = 0usize;
    while let Some(rel) = drawing_xml[pos..].find("<xdr:twoCellAnchor") {
        let abs = pos + rel;
        let end_rel = drawing_xml[abs..]
            .find("</xdr:twoCellAnchor>")
            .map(|e| abs + e + "</xdr:twoCellAnchor>".len());
        let end = end_rel?;
        let chunk = &drawing_xml[abs..end];
        if chunk.contains("<xdr:sp") && !chunk.contains("<xdr:cxnSp") {
            if count == shape_index {
                return Some((anchor_from_xml(chunk)?, anchor_to_xml(chunk)?));
            }
            count += 1;
        }
        pos = end;
    }
    None
}

fn line_width_emu(broken: bool) -> u32 {
    let px = if broken { 1.75 } else { 1.25 };
    (px * EMU_PER_PX as f64).round() as u32
}

fn connector_line_xml(stroke_rgb: &str, broken: bool) -> String {
    let w = line_width_emu(broken);
    format!(
        r#"<a:ln w="{w}"><a:solidFill><a:srgbClr val="{stroke_rgb}"/></a:solidFill><a:tailEnd type="triangle" w="med" len="med"/></a:ln>"#,
        w = w,
        stroke_rgb = stroke_rgb.trim_start_matches('#'),
    )
}

fn bent_adj_xml(adj1: u32) -> String {
    format!(
        r#"<a:prstGeom prst="bentConnector3"><a:avLst><a:gd name="adj1" fmla="val {adj1}"/></a:avLst></a:prstGeom>"#,
        adj1 = adj1,
    )
}

fn straight_geom_xml() -> &'static str {
    r#"<a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom>"#
}

fn curved_geom_xml() -> &'static str {
    r#"<a:prstGeom prst="curvedConnector3"><a:avLst/></a:prstGeom>"#
}

fn connection_curve_line_width_emu() -> u32 {
    (2.25 * EMU_PER_PX as f64).round() as u32
}

fn connection_curve_line_xml(stroke_rgb: &str) -> String {
    let w = connection_curve_line_width_emu();
    format!(
        r#"<a:ln w="{w}"><a:solidFill><a:srgbClr val="{stroke_rgb}"/></a:solidFill></a:ln>"#,
        w = w,
        stroke_rgb = stroke_rgb.trim_start_matches('#'),
    )
}

fn connection_curve_top_center_corners(
    from_a: &str,
    to_a: &str,
    from_b: &str,
    to_b: &str,
    left_count: u32,
    date_col_width_emu: u64,
) -> Option<(AnchorCorner, AnchorCorner)> {
    let a_from = parse_anchor(from_a)?;
    let a_to = parse_anchor(to_a)?;
    let b_from = parse_anchor(from_b)?;
    let b_to = parse_anchor(to_b)?;
    let start = top_edge_center(a_from, a_to, left_count, date_col_width_emu);
    let end = top_edge_center(b_from, b_to, left_count, date_col_width_emu);
    Some((start, end))
}

fn date_area_x(corner: AnchorCorner, left_count: u32, date_col_width_emu: u64) -> u64 {
    let w = date_col_width_emu.max(1);
    (corner.col.saturating_sub(left_count)) as u64 * w + corner.col_off
}

const CONNECTION_LABEL_FONT_SIZE_PT: f64 = 8.0;

fn connection_label_font_size_px() -> f64 {
    CONNECTION_LABEL_FONT_SIZE_PT * 96.0 / 72.0
}

fn estimate_connection_label_width_emu(label: &str) -> u64 {
    let font_size = connection_label_font_size_px();
    let mut text_width = 0.0;
    for ch in label.chars() {
        text_width += if ch as u32 > 0xff {
            font_size
        } else {
            font_size * 0.62
        };
    }
    text_width += font_size * 0.25;
    (text_width * EMU_PER_PX as f64).round() as u64
}

fn connection_label_height_emu() -> u64 {
    (connection_label_font_size_px() * EMU_PER_PX as f64).round() as u64
}

fn escape_xml_text(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn label_box_corners(
    start: AnchorCorner,
    end: AnchorCorner,
    width_emu: u64,
    height_emu: u64,
    left_count: u32,
    date_col_width_emu: u64,
    body_row_height_emu: u64,
) -> (AnchorCorner, AnchorCorner) {
    let w = date_col_width_emu.max(1);
    let x1 = date_area_x(start, left_count, w);
    let x2 = date_area_x(end, left_count, w);
    let y1 = row_y(start, body_row_height_emu);
    let y2 = row_y(end, body_row_height_emu);
    let mid_x = (x1 + x2) / 2;
    let mid_y = (y1 + y2) / 2;
    let left_x = mid_x.saturating_sub(width_emu / 2);
    let right_x = left_x + width_emu;
    let top_y = mid_y.saturating_sub(height_emu / 2);
    let bottom_y = top_y + height_emu;
    let (from_row, from_row_off) = y_to_row_off(top_y, body_row_height_emu);
    let (to_row, to_row_off) = y_to_row_off(bottom_y, body_row_height_emu);
    let from = x_in_date_area_to_corner(left_x, left_count, w, from_row, from_row_off);
    let to = x_in_date_area_to_corner(right_x, left_count, w, to_row, to_row_off);
    (from, to)
}

fn build_connection_curve_label_anchor(
    curve: &ExcelExportConnectionCurve,
    drawing_xml: &str,
    drawing_index: u32,
    body_row_height_px: u32,
    left_count: u32,
    date_col_width_px: u32,
) -> Option<String> {
    let body_row_height_emu = emu_per_body_row(body_row_height_px);
    let date_col_width_emu = u64::from(date_col_width_px.max(1)) * EMU_PER_PX;
    let (from_a, to_a) = shape_anchor_blocks(drawing_xml, curve.from_shape_index)?;
    let (from_b, to_b) = shape_anchor_blocks(drawing_xml, curve.to_shape_index)?;
    let (start, end) = connection_curve_top_center_corners(
        &from_a,
        &to_a,
        &from_b,
        &to_b,
        left_count,
        date_col_width_emu,
    )?;
    let width_emu = estimate_connection_label_width_emu(&curve.label).max(1);
    let height_emu = connection_label_height_emu().max(1);
    let (from, to) = label_box_corners(
        start,
        end,
        width_emu,
        height_emu,
        left_count,
        date_col_width_emu,
        body_row_height_emu,
    );
    let cnv_id = drawing_index + 1;
    let rgb = curve.label_text_rgb.trim_start_matches('#');
    let label = escape_xml_text(&curve.label);
    let from_anchor = format_anchor(from);
    let to_anchor = format_anchor(to);
    Some(format!(
        r#"<xdr:twoCellAnchor><xdr:from>{from_anchor}</xdr:from><xdr:to>{to_anchor}</xdr:to><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="{cnv_id}" name="Connection label {drawing_index}"/><xdr:cNvSpPr txBox="1"/></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></xdr:spPr>{style}<xdr:txBody><a:bodyPr wrap="none" anchor="ctr" rtlCol="0"/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="ja-JP" sz="800" b="0" i="0" u="none" strike="noStrike"><a:solidFill><a:srgbClr val="{rgb}"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/></a:rPr><a:t>{label}</a:t></a:r></a:p></xdr:txBody></xdr:sp><xdr:clientData/></xdr:twoCellAnchor>"#,
        style = CONNECTOR_STYLE,
    ))
}

fn connection_curve_anchors_from_shapes(
    from_a: &str,
    to_a: &str,
    from_b: &str,
    to_b: &str,
    body_row_height_emu: u64,
    left_count: u32,
    date_col_width_emu: u64,
) -> Option<(String, String, bool, bool)> {
    let a_from = parse_anchor(from_a)?;
    let a_to = parse_anchor(to_a)?;
    let b_from = parse_anchor(from_b)?;
    let b_to = parse_anchor(to_b)?;
    let start = top_edge_center(a_from, a_to, left_count, date_col_width_emu);
    let end = top_edge_center(b_from, b_to, left_count, date_col_width_emu);
    let flip_h = horizontal_cmp(end, start) == std::cmp::Ordering::Less;
    let flip_v = row_y(end, body_row_height_emu) < row_y(start, body_row_height_emu);
    let (from, to) = connector_bounds(start, end, body_row_height_emu);
    Some((
        format_anchor(from),
        format_anchor(to),
        flip_h,
        flip_v,
    ))
}

fn build_connection_curve_anchor(
    curve: &ExcelExportConnectionCurve,
    drawing_xml: &str,
    drawing_index: u32,
    body_row_height_px: u32,
    left_count: u32,
    date_col_width_px: u32,
) -> Option<String> {
    let body_row_height_emu = emu_per_body_row(body_row_height_px);
    let date_col_width_emu = u64::from(date_col_width_px.max(1)) * EMU_PER_PX;
    let (from_a, to_a) = shape_anchor_blocks(drawing_xml, curve.from_shape_index)?;
    let (from_b, to_b) = shape_anchor_blocks(drawing_xml, curve.to_shape_index)?;
    let (from, to, flip_h, flip_v) = connection_curve_anchors_from_shapes(
        &from_a,
        &to_a,
        &from_b,
        &to_b,
        body_row_height_emu,
        left_count,
        date_col_width_emu,
    )?;
    let flip_h_attr = if flip_h { "1" } else { "0" };
    let flip_v_attr = if flip_v { "1" } else { "0" };
    let from_shape_id = curve.from_shape_index as u32 + 2;
    let to_shape_id = curve.to_shape_index as u32 + 2;
    let cnv_id = drawing_index + 1;
    let line = connection_curve_line_xml(&curve.stroke_rgb);
    Some(format!(
        r#"<xdr:twoCellAnchor><xdr:from>{from}</xdr:from><xdr:to>{to}</xdr:to><xdr:cxnSp macro=""><xdr:nvCxnSpPr><xdr:cNvPr id="{cnv_id}" name="Curved Connector {drawing_index}"/><xdr:cNvCxnSpPr><a:stCxn id="{from_shape_id}" idx="0"/><a:endCxn id="{to_shape_id}" idx="0"/></xdr:cNvCxnSpPr></xdr:nvCxnSpPr><xdr:spPr><a:xfrm flipH="{flip_h_attr}" flipV="{flip_v_attr}"><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm>{prst}{line}</xdr:spPr>{style}</xdr:cxnSp><xdr:clientData/></xdr:twoCellAnchor>"#,
        prst = curved_geom_xml(),
        style = CONNECTOR_STYLE,
    ))
}

fn build_connector_anchor(
    connector: &ExcelExportConnector,
    drawing_xml: &str,
    drawing_index: u32,
    body_row_height_px: u32,
) -> Option<String> {
    let body_row_height_emu = emu_per_body_row(body_row_height_px);
    let (from_a, to_a) = shape_anchor_blocks(drawing_xml, connector.from_shape_index)?;
    let (from_b, to_b) = shape_anchor_blocks(drawing_xml, connector.to_shape_index)?;
    let (from, to, flip_h, flip_v) = connector_anchors_from_shapes(
        &from_a,
        &to_a,
        &from_b,
        &to_b,
        body_row_height_emu,
    )?;
    let flip_h_attr = if flip_h { "1" } else { "0" };
    let flip_v_attr = if flip_v { "1" } else { "0" };
    let from_shape_id = connector.from_shape_index as u32 + 2;
    let to_shape_id = connector.to_shape_index as u32 + 2;
    let cnv_id = drawing_index + 1;
    let prst = if connector.straight {
        straight_geom_xml()
    } else {
        &bent_adj_xml(connector.bent_adj1)
    };
    let name = if connector.straight {
        "Straight Arrow Connector"
    } else {
        "Elbow Arrow Connector"
    };
    let line = connector_line_xml(&connector.stroke_rgb, connector.broken);
    Some(format!(
        r#"<xdr:twoCellAnchor><xdr:from>{from}</xdr:from><xdr:to>{to}</xdr:to><xdr:cxnSp macro=""><xdr:nvCxnSpPr><xdr:cNvPr id="{cnv_id}" name="{name} {drawing_index}"/><xdr:cNvCxnSpPr><a:stCxn id="{from_shape_id}" idx="3"/><a:endCxn id="{to_shape_id}" idx="1"/></xdr:cNvCxnSpPr></xdr:nvCxnSpPr><xdr:spPr><a:xfrm flipH="{flip_h_attr}" flipV="{flip_v_attr}"><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm>{prst}{line}</xdr:spPr>{style}</xdr:cxnSp><xdr:clientData/></xdr:twoCellAnchor>"#,
        style = CONNECTOR_STYLE,
    ))
}

fn today_line_width_emu() -> u64 {
    (1.5 * EMU_PER_PX as f64).round() as u64
}

/// 等幅の日付列のうち、列内オフセットと幅から終端の列と列内オフセット（px）を求める。
pub(crate) fn horizontal_span_end_px(
    start_col: u32,
    start_col_off_px: u32,
    span_width_px: u32,
    date_col_width_px: u32,
) -> (u32, u32) {
    let col_w = u64::from(date_col_width_px.max(1));
    let mut col = start_col;
    let mut x2 = u64::from(start_col_off_px) + u64::from(span_width_px.max(1));
    while x2 >= col_w {
        x2 -= col_w;
        col += 1;
    }
    (col, x2 as u32)
}

fn build_summary_gap_line_anchor(
    line: &ExcelExportSummaryGapLine,
    drawing_index: u32,
    date_col_width_px: u32,
) -> String {
    let (end_col, end_col_off_px) = horizontal_span_end_px(
        line.anchor_col,
        line.x_offset_px,
        line.width_px,
        date_col_width_px,
    );
    let col_off_start = u64::from(line.x_offset_px) * EMU_PER_PX;
    let col_off_end = u64::from(end_col_off_px) * EMU_PER_PX;
    let row_off = u64::from(line.y_offset_px) * EMU_PER_PX;
    let width_emu = u64::from(line.width_px.max(1)) * EMU_PER_PX;
    let height_emu = EMU_PER_PX;
    let cnv_id = drawing_index + 1;
    let rgb = line.stroke_rgb.trim_start_matches('#');
    format!(
        r#"<xdr:twoCellAnchor><xdr:from><xdr:col>{col}</xdr:col><xdr:colOff>{col_off_start}</xdr:colOff><xdr:row>{row}</xdr:row><xdr:rowOff>{row_off}</xdr:rowOff></xdr:from><xdr:to><xdr:col>{end_col}</xdr:col><xdr:colOff>{col_off_end}</xdr:colOff><xdr:row>{row}</xdr:row><xdr:rowOff>{row_off}</xdr:rowOff></xdr:to><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="{cnv_id}" name="Summary gap {drawing_index}"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{width_emu}" cy="{height_emu}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="9525"><a:solidFill><a:srgbClr val="{rgb}"/></a:solidFill><a:prstDash val="dash"/></a:ln><a:noFill/></xdr:spPr>{CONNECTOR_STYLE}<xdr:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></xdr:txBody></xdr:sp><xdr:clientData/></xdr:twoCellAnchor>"#,
        col = line.anchor_col,
        row = line.row,
        col_off_start = col_off_start,
        end_col = end_col,
        col_off_end = col_off_end,
        row_off = row_off,
        width_emu = width_emu,
        height_emu = height_emu,
        cnv_id = cnv_id,
        rgb = rgb,
        drawing_index = drawing_index,
    )
}

fn build_summary_cap_anchor(
    cap: &ExcelExportSummaryCap,
    drawing_index: u32,
    date_col_width_px: u32,
) -> String {
    let size_px = cap.size_px.max(1);
    let (end_col, end_col_off_px) =
        horizontal_span_end_px(cap.anchor_col, cap.x_offset_px, size_px, date_col_width_px);
    let size = u64::from(size_px) * EMU_PER_PX;
    let col_off = u64::from(cap.x_offset_px) * EMU_PER_PX;
    let col_off_end = u64::from(end_col_off_px) * EMU_PER_PX;
    let row_off = u64::from(cap.y_offset_px) * EMU_PER_PX;
    let flip_h = if cap.side == "right" { "1" } else { "0" };
    let cnv_id = drawing_index + 1;
    let rgb = cap.fill_rgb.trim_start_matches('#');
    format!(
        r#"<xdr:twoCellAnchor><xdr:from><xdr:col>{col}</xdr:col><xdr:colOff>{col_off}</xdr:colOff><xdr:row>{row}</xdr:row><xdr:rowOff>{row_off}</xdr:rowOff></xdr:from><xdr:to><xdr:col>{end_col}</xdr:col><xdr:colOff>{col_off_end}</xdr:colOff><xdr:row>{row}</xdr:row><xdr:rowOff>{row_off}</xdr:rowOff></xdr:to><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="{cnv_id}" name="Summary cap {drawing_index}"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr><a:xfrm flipH="{flip_h}"><a:off x="0" y="0"/><a:ext cx="{size}" cy="{size}"/></a:xfrm><a:prstGeom prst="rtTriangle"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="{rgb}"/></a:solidFill><a:ln><a:noFill/></a:ln></xdr:spPr>{CONNECTOR_STYLE}<xdr:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></xdr:txBody></xdr:sp><xdr:clientData/></xdr:twoCellAnchor>"#,
        col = cap.anchor_col,
        col_off = col_off,
        row = cap.row,
        row_off = row_off,
        end_col = end_col,
        col_off_end = col_off_end,
        flip_h = flip_h,
        size = size,
        cnv_id = cnv_id,
        rgb = rgb,
        drawing_index = drawing_index,
    )
}

fn build_today_line_anchor(
    line: &ExcelExportTodayLine,
    drawing_index: u32,
    body_row_height_px: u32,
) -> String {
    let col_off = u64::from(line.x_offset_px) * EMU_PER_PX;
    let width = today_line_width_emu();
    let height = u64::from(line.height_px) * EMU_PER_PX;
    let row_h = body_row_height_px.max(1);
    let body_rows = line.height_px.div_ceil(row_h);
    let end_row = line.row + body_rows.saturating_sub(1);
    let row_h_emu = emu_per_body_row(row_h);
    let end_row_off = if body_rows <= 1 {
        height
    } else {
        row_h_emu
    };
    let cnv_id = drawing_index + 1;
    let rgb = line.stroke_rgb.trim_start_matches('#');
    format!(
        r#"<xdr:twoCellAnchor><xdr:from><xdr:col>{col}</xdr:col><xdr:colOff>{col_off}</xdr:colOff><xdr:row>{row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>{col}</xdr:col><xdr:colOff>{col_off_end}</xdr:colOff><xdr:row>{end_row}</xdr:row><xdr:rowOff>{end_row_off}</xdr:rowOff></xdr:to><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="{cnv_id}" name="Line {drawing_index}"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{width}" cy="{height}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="19050"><a:solidFill><a:srgbClr val="{rgb}"><a:alpha val="45000"/></a:srgbClr></a:solidFill></a:ln><a:noFill/></xdr:spPr>{CONNECTOR_STYLE}<xdr:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></xdr:txBody></xdr:sp><xdr:clientData/></xdr:twoCellAnchor>"#,
        col = line.anchor_col,
        col_off = col_off,
        row = line.row,
        col_off_end = col_off + width,
        end_row = end_row,
        end_row_off = end_row_off,
        width = width,
        height = height,
        cnv_id = cnv_id,
        rgb = rgb,
        drawing_index = drawing_index,
    )
}

#[cfg(test)]
pub(crate) fn connector_snap_bounds_from_bar_blocks(
    bar0_block: &str,
    bar1_block: &str,
    body_row_height_px: u32,
) -> Option<(String, String, bool, bool)> {
    let from_a = anchor_from_xml(bar0_block)?;
    let to_a = anchor_to_xml(bar0_block)?;
    let from_b = anchor_from_xml(bar1_block)?;
    let to_b = anchor_to_xml(bar1_block)?;
    let body_row_height_emu = emu_per_body_row(body_row_height_px);
    let (from, to, flip_h, flip_v) = connector_anchors_from_shapes(
        &from_a,
        &to_a,
        &from_b,
        &to_b,
        body_row_height_emu,
    )?;
    Some((from, to, flip_h, flip_v))
}

fn patch_drawing_xml(drawing_xml: &str, payload: &ExcelExportPayload) -> String {
    let mut extra = String::new();
    // rust_xlsxwriter の図形 id は 2 から n+1。追加図形は n+2 から。
    let base_index = payload.shapes.len() as u32 + 1;
    let body_row_height_px = payload.body_row_height_px;
    let date_col_width_px = payload.date_column_width_px;
    for (i, connector) in payload.connectors.iter().enumerate() {
        if let Some(block) = build_connector_anchor(
            connector,
            drawing_xml,
            base_index + i as u32,
            body_row_height_px,
        ) {
            extra.push_str(&block);
        }
    }
    let mut next_index = base_index + payload.connectors.len() as u32;
    let left_count = payload.freeze_col;
    for (i, curve) in payload.connection_curves.iter().enumerate() {
        let curve_index = next_index + (i as u32) * 2;
        if let Some(block) = build_connection_curve_anchor(
            curve,
            drawing_xml,
            curve_index,
            body_row_height_px,
            left_count,
            date_col_width_px,
        ) {
            extra.push_str(&block);
        }
        if let Some(block) = build_connection_curve_label_anchor(
            curve,
            drawing_xml,
            curve_index + 1,
            body_row_height_px,
            left_count,
            date_col_width_px,
        ) {
            extra.push_str(&block);
        }
    }
    next_index += payload.connection_curves.len() as u32 * 2;
    if let Some(line) = &payload.today_line {
        extra.push_str(&build_today_line_anchor(line, next_index, body_row_height_px));
        next_index += 1;
    }
    for (i, gap) in payload.summary_gap_lines.iter().enumerate() {
        extra.push_str(&build_summary_gap_line_anchor(
            gap,
            next_index + i as u32,
            date_col_width_px,
        ));
    }
    next_index += payload.summary_gap_lines.len() as u32;
    for (i, cap) in payload.summary_caps.iter().enumerate() {
        extra.push_str(&build_summary_cap_anchor(
            cap,
            next_index + i as u32,
            date_col_width_px,
        ));
    }
    if extra.is_empty() {
        return drawing_xml.to_string();
    }
    if let Some(pos) = drawing_xml.rfind("</xdr:wsDr>") {
        let mut out = String::with_capacity(drawing_xml.len() + extra.len());
        out.push_str(&drawing_xml[..pos]);
        out.push_str(&extra);
        out.push_str("</xdr:wsDr>");
        return out;
    }
    format!(
        r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">{extra}</xdr:wsDr>"#,
    )
}

fn ensure_sheet_drawing(
    sheet_xml: &str,
    rels_xml: &str,
    drawing_rel_id: &str,
) -> (String, String, bool) {
    if sheet_xml.contains("<drawing ") {
        return (sheet_xml.to_string(), rels_xml.to_string(), false);
    }
    let mut sheet = sheet_xml.to_string();
    if let Some(pos) = sheet.rfind("</worksheet>") {
        let insert = format!(r#"<drawing r:id="{drawing_rel_id}"/>"#);
        sheet.insert_str(pos, &insert);
    }
    let rel_entry = r#"<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>"#;
    let mut rels = if rels_xml.is_empty() {
        r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>"#.to_string()
    } else {
        rels_xml.to_string()
    };
    if !rels.contains("drawing1.xml") {
        if let Some(pos) = rels.rfind("</Relationships>") {
            rels.insert_str(pos, rel_entry);
        }
    }
    (sheet, rels, true)
}

fn ensure_content_types(content_types: &str) -> String {
    if content_types.contains("/drawings") {
        return content_types.to_string();
    }
    let part = r#"<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>"#;
    if let Some(pos) = content_types.rfind("</Types>") {
        let mut out = content_types.to_string();
        out.insert_str(pos, part);
        return out;
    }
    content_types.to_string()
}

fn rewrite_zip(
    bytes: &[u8],
    payload: &ExcelExportPayload,
) -> Result<Vec<u8>, String> {
    let mut archive = ZipArchive::new(Cursor::new(bytes)).map_err(|e| e.to_string())?;
    let mut files: HashMap<String, Vec<u8>> = HashMap::new();
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = file
            .name()
            .map_err(|e| e.to_string())?
            .into_owned();
        let mut data = Vec::new();
        file.read_to_end(&mut data).map_err(|e| e.to_string())?;
        files.insert(name, data);
    }

    let drawing_key = "xl/drawings/drawing1.xml";
    let had_drawing = files.contains_key(drawing_key);
    let drawing_xml = if had_drawing {
        String::from_utf8(files[drawing_key].clone()).map_err(|e| e.to_string())?
    } else {
        String::new()
    };
    let patched = patch_drawing_xml(&drawing_xml, payload);
    files.insert(drawing_key.to_string(), patched.into_bytes());

    if !had_drawing
        && (!payload.connectors.is_empty()
            || !payload.connection_curves.is_empty()
            || payload.today_line.is_some()
            || !payload.summary_gap_lines.is_empty()
            || !payload.summary_caps.is_empty())
    {
        files.insert(
            "xl/drawings/_rels/drawing1.xml.rels".to_string(),
            br#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>"#
                .to_vec(),
        );
        let sheet_key = "xl/worksheets/sheet1.xml";
        let rels_key = "xl/worksheets/_rels/sheet1.xml.rels";
        let sheet = String::from_utf8(
            files
                .get(sheet_key)
                .cloned()
                .ok_or_else(|| "sheet1.xml が見つかりません".to_string())?,
        )
        .map_err(|e| e.to_string())?;
        let rels = files
            .get(rels_key)
            .map(|b| String::from_utf8(b.clone()).unwrap_or_default())
            .unwrap_or_default();
        let (new_sheet, new_rels, _) = ensure_sheet_drawing(&sheet, &rels, "rId1");
        files.insert(sheet_key.to_string(), new_sheet.into_bytes());
        files.insert(rels_key.to_string(), new_rels.into_bytes());
        if let Some(ct) = files.get("[Content_Types].xml") {
            let ct_str = String::from_utf8(ct.clone()).map_err(|e| e.to_string())?;
            files.insert(
                "[Content_Types].xml".to_string(),
                ensure_content_types(&ct_str).into_bytes(),
            );
        }
    }

    let mut out = Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(&mut out);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    for (name, data) in files {
        writer
            .start_file(name, options)
            .map_err(|e| e.to_string())?;
        writer.write_all(&data).map_err(|e| e.to_string())?;
    }
    writer.finish().map_err(|e| e.to_string())?;
    Ok(out.into_inner())
}

pub fn patch_excel_drawings(bytes: Vec<u8>, payload: &ExcelExportPayload) -> Result<Vec<u8>, String> {
    if payload.connectors.is_empty()
        && payload.connection_curves.is_empty()
        && payload.today_line.is_none()
        && payload.summary_gap_lines.is_empty()
        && payload.summary_caps.is_empty()
    {
        return Ok(bytes);
    }
    rewrite_zip(&bytes, payload)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn anchor_block(from: AnchorCorner, to: AnchorCorner) -> String {
        format!(
            r#"<xdr:twoCellAnchor><xdr:from>{}</xdr:from><xdr:to>{}</xdr:to><xdr:sp/></xdr:twoCellAnchor>"#,
            format_anchor(from),
            format_anchor(to),
        )
    }

    fn emu(px: u64) -> u64 {
        px * EMU_PER_PX
    }

    #[test]
    fn horizontal_span_end_advances_columns_by_width() {
        let (col, off) = horizontal_span_end_px(4, 0, 240, 48);
        assert_eq!(col, 9);
        assert_eq!(off, 0);
        let (col2, off2) = horizontal_span_end_px(4, 10, 50, 48);
        assert_eq!(col2, 5);
        assert_eq!(off2, 12);
    }

    #[test]
    fn connector_anchors_use_edge_centers_same_row() {
        let top = AnchorCorner {
            col: 4,
            row: 2,
            col_off: emu(10),
            row_off: emu(4),
        };
        let bottom = AnchorCorner {
            col: 4,
            row: 2,
            col_off: emu(58),
            row_off: emu(18),
        };
        let from_a = format_anchor(top);
        let to_a = format_anchor(bottom);
        let from_b = format_anchor(AnchorCorner {
            col: 6,
            row: 2,
            col_off: emu(0),
            row_off: emu(4),
        });
        let to_b = format_anchor(AnchorCorner {
            col: 6,
            row: 2,
            col_off: emu(40),
            row_off: emu(18),
        });
        let body_emu = emu_per_body_row(22);
        let (from, _to, flip_h, flip_v) = connector_anchors_from_shapes(
            &from_a,
            &to_a,
            &from_b,
            &to_b,
            body_emu,
        )
        .unwrap();
        assert!(!flip_h);
        assert!(!flip_v);
        assert!(from.contains(&format!("<xdr:colOff>{}</xdr:colOff>", emu(58))));
        assert!(from.contains(&format!("<xdr:rowOff>{}</xdr:rowOff>", emu(11))));
    }

    #[test]
    fn connector_anchors_flip_v_when_successor_above() {
        let from_a = format_anchor(AnchorCorner {
            col: 4,
            row: 3,
            col_off: emu(10),
            row_off: emu(4),
        });
        let to_a = format_anchor(AnchorCorner {
            col: 4,
            row: 3,
            col_off: emu(50),
            row_off: emu(18),
        });
        let from_b = format_anchor(AnchorCorner {
            col: 5,
            row: 2,
            col_off: emu(0),
            row_off: emu(4),
        });
        let to_b = format_anchor(AnchorCorner {
            col: 5,
            row: 2,
            col_off: emu(40),
            row_off: emu(18),
        });
        let body_emu = emu_per_body_row(22);
        let (_, _, flip_h, flip_v) = connector_anchors_from_shapes(
            &from_a,
            &to_a,
            &from_b,
            &to_b,
            body_emu,
        )
        .unwrap();
        assert!(!flip_h);
        assert!(flip_v);
    }

    #[test]
    fn connector_anchors_flip_h_when_successor_left() {
        let from_a = format_anchor(AnchorCorner {
            col: 6,
            row: 2,
            col_off: emu(10),
            row_off: emu(4),
        });
        let to_a = format_anchor(AnchorCorner {
            col: 6,
            row: 2,
            col_off: emu(50),
            row_off: emu(18),
        });
        let from_b = format_anchor(AnchorCorner {
            col: 4,
            row: 2,
            col_off: emu(0),
            row_off: emu(4),
        });
        let to_b = format_anchor(AnchorCorner {
            col: 4,
            row: 2,
            col_off: emu(40),
            row_off: emu(18),
        });
        let body_emu = emu_per_body_row(22);
        let (_, _, flip_h, flip_v) = connector_anchors_from_shapes(
            &from_a,
            &to_a,
            &from_b,
            &to_b,
            body_emu,
        )
        .unwrap();
        assert!(flip_h);
        assert!(!flip_v);
    }

    #[test]
    fn connector_xml_uses_flips_from_drawing() {
        let drawing = format!(
            "{}{}",
            anchor_block(
                AnchorCorner {
                    col: 4,
                    row: 3,
                    col_off: emu(0),
                    row_off: emu(4),
                },
                AnchorCorner {
                    col: 4,
                    row: 3,
                    col_off: emu(48),
                    row_off: emu(18),
                },
            ),
            anchor_block(
                AnchorCorner {
                    col: 5,
                    row: 2,
                    col_off: emu(0),
                    row_off: emu(4),
                },
                AnchorCorner {
                    col: 5,
                    row: 2,
                    col_off: emu(48),
                    row_off: emu(18),
                },
            ),
        );
        let drawing_xml = format!(
            r#"<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">{drawing}</xdr:wsDr>"#
        );
        let connector = ExcelExportConnector {
            from_shape_index: 0,
            to_shape_index: 1,
            stroke_rgb: "3366CC".into(),
            broken: false,
            straight: false,
            bent_adj1: 50_000,
        };
        let block = build_connector_anchor(&connector, &drawing_xml, 0, 22).unwrap();
        assert!(block.contains("flipH=\"0\""));
        assert!(block.contains("flipV=\"1\""));
        assert!(block.contains("idx=\"3\""));
        assert!(block.contains("idx=\"1\""));
    }

    #[test]
    fn connection_curve_uses_top_sites_and_default_curve() {
        let drawing = format!(
            "{}{}",
            anchor_block(
                AnchorCorner {
                    col: 4,
                    row: 2,
                    col_off: emu(10),
                    row_off: emu(4),
                },
                AnchorCorner {
                    col: 4,
                    row: 2,
                    col_off: emu(58),
                    row_off: emu(18),
                },
            ),
            anchor_block(
                AnchorCorner {
                    col: 6,
                    row: 3,
                    col_off: emu(0),
                    row_off: emu(4),
                },
                AnchorCorner {
                    col: 6,
                    row: 3,
                    col_off: emu(48),
                    row_off: emu(18),
                },
            ),
        );
        let drawing_xml = format!(
            r#"<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">{drawing}</xdr:wsDr>"#
        );
        let curve = ExcelExportConnectionCurve {
            from_shape_index: 0,
            to_shape_index: 1,
            stroke_rgb: "0369A1".into(),
            label: "斜めの関係".into(),
            label_text_rgb: "075985".into(),
        };
        let block = build_connection_curve_anchor(&curve, &drawing_xml, 2, 22, 4, 48).unwrap();
        assert!(block.contains("curvedConnector3"));
        assert!(block.contains("<a:avLst/>"));
        assert!(block.contains("idx=\"0\""));
        assert!(!block.contains("type=\"triangle\""));
        assert!(block.contains("val=\"0369A1\""));
    }

    #[test]
    fn connection_curve_label_is_a_separate_textbox() {
        let drawing = format!(
            "{}{}",
            anchor_block(
                AnchorCorner {
                    col: 4,
                    row: 2,
                    col_off: emu(10),
                    row_off: emu(4),
                },
                AnchorCorner {
                    col: 4,
                    row: 2,
                    col_off: emu(58),
                    row_off: emu(18),
                },
            ),
            anchor_block(
                AnchorCorner {
                    col: 6,
                    row: 3,
                    col_off: emu(0),
                    row_off: emu(4),
                },
                AnchorCorner {
                    col: 6,
                    row: 3,
                    col_off: emu(48),
                    row_off: emu(18),
                },
            ),
        );
        let drawing_xml = format!(
            r#"<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">{drawing}</xdr:wsDr>"#
        );
        let curve = ExcelExportConnectionCurve {
            from_shape_index: 0,
            to_shape_index: 1,
            stroke_rgb: "0369A1".into(),
            label: "斜めの関係".into(),
            label_text_rgb: "075985".into(),
        };
        let block = build_connection_curve_label_anchor(&curve, &drawing_xml, 3, 22, 4, 48).unwrap();
        assert!(block.contains("sz=\"800\""));
        assert!(block.contains("<a:t>斜めの関係</a:t>"));
        assert!(block.contains("val=\"075985\""));
        assert!(block.contains("<xdr:sp macro=\"\""));
        assert!(!block.contains("<xdr:cxnSp"));
        assert!(block.contains("<a:noFill/>"));
    }
}
