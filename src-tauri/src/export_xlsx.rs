use rust_xlsxwriter::{
    Color, Format, FormatBorder, ObjectMovement, Shape, ShapeFont, ShapeFormat,
    ShapePatternFill, ShapePatternFillType, ShapeSolidFill, Workbook, Worksheet, XlsxError,
};
use serde::Deserialize;

pub const MAX_EXCEL_BYTES: usize = 10 * 1024 * 1024;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct ExcelTimeColumn {
    pub start_iso: String,
    pub end_exclusive_iso: String,
    pub header_label: String,
    pub non_working: bool,
    pub left_border_rgb: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcelExportSummaryGapLine {
    pub row: u32,
    pub anchor_col: u32,
    pub x_offset_px: u32,
    pub y_offset_px: u32,
    pub width_px: u32,
    pub stroke_rgb: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcelExportSummaryCap {
    pub row: u32,
    pub anchor_col: u32,
    pub x_offset_px: u32,
    pub y_offset_px: u32,
    pub size_px: u32,
    pub side: String,
    pub fill_rgb: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcelExportConnector {
    pub from_shape_index: usize,
    pub to_shape_index: usize,
    pub stroke_rgb: String,
    pub broken: bool,
    pub straight: bool,
    pub bent_adj1: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcelExportTodayLine {
    pub row: u32,
    pub anchor_col: u32,
    pub x_offset_px: u32,
    pub height_px: u32,
    pub stroke_rgb: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcelExportShape {
    pub row: u32,
    pub anchor_col: u32,
    pub x_offset_px: u32,
    pub y_offset_px: u32,
    pub width_px: u32,
    pub height_px: u32,
    pub fill_rgb: String,
    pub pattern: String,
    pub pattern_fore_rgb: Option<String>,
    pub fill_transparency: Option<u8>,
    pub text: Option<String>,
    pub text_rgb: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcelExportRow {
    pub kind: String,
    pub cells: Vec<String>,
    pub name_overdue: bool,
    pub name_indent: u8,
    pub name_bold: bool,
    pub name_text_rgb: String,
    #[serde(default)]
    pub row_fill_rgb: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcelMilestoneRow {
    pub name: String,
    #[allow(dead_code)]
    pub marks: Vec<MilestoneMark>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MilestoneMark {
    #[allow(dead_code)]
    pub col_index: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MilestoneMarkCell {
    pub row: u32,
    pub col_index: u32,
    pub character: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcelExportPayload {
    pub sheet_title: String,
    pub preamble: String,
    pub freeze_row: u32,
    pub freeze_col: u32,
    pub left_headers: Vec<String>,
    pub date_columns: Vec<ExcelTimeColumn>,
    pub milestone_rows: Vec<ExcelMilestoneRow>,
    pub rows: Vec<ExcelExportRow>,
    pub shapes: Vec<ExcelExportShape>,
    pub connectors: Vec<ExcelExportConnector>,
    pub today_line: Option<ExcelExportTodayLine>,
    pub milestone_marks: Vec<MilestoneMarkCell>,
    #[allow(dead_code)]
    pub header_gray_rgb: String,
    pub non_working_fill_rgb: String,
    pub category_heading_fill_rgb: String,
    pub table_border_rgb: String,
    pub summary_gap_lines: Vec<ExcelExportSummaryGapLine>,
    pub summary_caps: Vec<ExcelExportSummaryCap>,
    pub overdue_name_rgb: String,
    pub gray_header_only: bool,
    pub note_wrap_column_index: Option<u32>,
    pub todos_wrap_column_index: Option<u32>,
    pub date_column_width_px: u32,
    pub body_row_height_px: u32,
    pub header_row_height_px: u32,
}

/// `rust_xlsxwriter` は 5px 未満の幅・高さを無視し、既定の 192×120 になる。
const SHAPE_WRITER_MIN_PX: u32 = 5;
pub(crate) fn shape_pixel_dimensions(width_px: u32, height_px: u32) -> (u32, u32) {
    let w = width_px.max(1);
    let h = height_px.max(1);
    let min_dim = w.min(h);
    let max_dim = w.max(h);
    let short_min = if min_dim < SHAPE_WRITER_MIN_PX {
        SHAPE_WRITER_MIN_PX
    } else {
        min_dim
    };
    if w <= h {
        (short_min, max_dim)
    } else {
        (max_dim, short_min)
    }
}

fn with_left_table_borders(format: Format, border: Color) -> Format {
    format
        .set_border_top(FormatBorder::Thin)
        .set_border_top_color(border)
        .set_border_bottom(FormatBorder::Thin)
        .set_border_bottom_color(border)
        .set_border_left(FormatBorder::Thin)
        .set_border_left_color(border)
        .set_border_right(FormatBorder::Thin)
        .set_border_right_color(border)
}

fn date_vertical_borders(
    format: Format,
    left: Color,
    right: Option<Color>,
) -> Format {
    let mut f = format
        .set_border_left(FormatBorder::Thin)
        .set_border_left_color(left);
    if let Some(color) = right {
        f = f
            .set_border_right(FormatBorder::Thin)
            .set_border_right_color(color);
    }
    f
}

fn parse_color(hex: &str) -> Color {
    let trimmed = hex.trim_start_matches('#');
    if trimmed.len() == 6 {
        let value = u32::from_str_radix(trimmed, 16).unwrap_or(0x808080);
        Color::RGB(value)
    } else {
        Color::RGB(0x808080)
    }
}

pub fn write_excel_bytes(payload: &ExcelExportPayload) -> Result<Vec<u8>, String> {
    let mut workbook = Workbook::new();
    let sheet_name = truncate_sheet_title(&payload.sheet_title);
    let worksheet = workbook.add_worksheet();
    worksheet
        .set_name(&sheet_name)
        .map_err(|e| e.to_string())?;
    worksheet.set_screen_gridlines(false);

    let left_count = payload.left_headers.len();
    let date_count = payload.date_columns.len();
    let non_working = parse_color(&payload.non_working_fill_rgb);
    let category_heading_fill = parse_color(&payload.category_heading_fill_rgb);
    let table_border = parse_color(&payload.table_border_rgb);
    let overdue = parse_color(&payload.overdue_name_rgb);
    let note_wrap = payload.note_wrap_column_index;
    let todos_wrap = payload.todos_wrap_column_index;
    let date_col_width = payload.date_column_width_px.max(1);
    let last_col = if left_count + date_count == 0 {
        0u16
    } else {
        (left_count + date_count - 1) as u16
    };
    let left_last_col = if left_count == 0 {
        0u16
    } else {
        (left_count - 1) as u16
    };

    worksheet
        .set_column_width(0, 28.0)
        .map_err(|e| e.to_string())?;
    for col in 1..left_count {
        worksheet
            .set_column_width(col as u16, 12.0)
            .map_err(|e| e.to_string())?;
    }
    for col in 0..date_count {
        worksheet
            .set_column_width_pixels((left_count + col) as u16, date_col_width)
            .map_err(|e| e.to_string())?;
    }

    let preamble_format = Format::new().set_text_wrap();
    if last_col > 0 {
        worksheet
            .merge_range(0, 0, 0, last_col, &payload.preamble, &preamble_format)
            .map_err(|e| e.to_string())?;
    } else {
        worksheet
            .write_string(0, 0, &payload.preamble)
            .map_err(|e| e.to_string())?;
    }
    worksheet
        .set_row_height(0, 36.0)
        .map_err(|e| e.to_string())?;

    let mut row = 1u32;
    let milestone_format = Format::new();
    for milestone in &payload.milestone_rows {
        if left_count > 1 {
            worksheet
                .merge_range(
                    row,
                    0,
                    row,
                    left_last_col,
                    &milestone.name,
                    &milestone_format,
                )
                .map_err(|e| e.to_string())?;
        } else {
            worksheet
                .write_string_with_format(row, 0, &milestone.name, &milestone_format)
                .map_err(|e| e.to_string())?;
        }
        row += 1;
    }

    let header_row = row;
    let header_left_format =
        with_left_table_borders(Format::new().set_bold(), table_border);
    worksheet
        .set_row_height_pixels(header_row, payload.header_row_height_px)
        .map_err(|e| e.to_string())?;
    for (col, label) in payload.left_headers.iter().enumerate() {
        worksheet
            .write_string_with_format(header_row, col as u16, label, &header_left_format)
            .map_err(|e| e.to_string())?;
    }
    for (index, column) in payload.date_columns.iter().enumerate() {
        let col = left_count + index;
        let left = parse_color(&column.left_border_rgb);
        let right = if index + 1 == date_count {
            Some(left)
        } else {
            None
        };
        let mut format = date_vertical_borders(Format::new().set_bold(), left, right);
        if payload.gray_header_only && column.non_working {
            format = format.set_background_color(non_working);
        }
        worksheet
            .write_string_with_format(header_row, col as u16, &column.header_label, &format)
            .map_err(|e| e.to_string())?;
    }
    row += 1;

    for export_row in &payload.rows {
        worksheet
            .set_row_height_pixels(row, payload.body_row_height_px)
            .map_err(|e| e.to_string())?;
        let is_category = export_row.kind == "category";
        let name_color = parse_color(&export_row.name_text_rgb);
        let row_fill = export_row
            .row_fill_rgb
            .as_ref()
            .map(|rgb| parse_color(rgb));
        for (col, value) in export_row.cells.iter().enumerate() {
            let mut format = with_left_table_borders(Format::new(), table_border);
            if let Some(fill) = row_fill {
                format = format.set_background_color(fill);
            } else if is_category {
                format = format.set_background_color(category_heading_fill);
            }
            if col == 0 {
                format = format
                    .set_indent(export_row.name_indent)
                    .set_font_color(name_color);
                if export_row.name_bold {
                    format = format.set_bold();
                }
                if export_row.name_overdue {
                    format = format.set_font_color(overdue);
                }
            }
            if note_wrap == Some(col as u32) || todos_wrap == Some(col as u32) {
                format = format.set_text_wrap();
            }
            worksheet
                .write_string_with_format(row, col as u16, value, &format)
                .map_err(|e| e.to_string())?;
        }
        for (index, column) in payload.date_columns.iter().enumerate() {
            let col = left_count + index;
            let left = parse_color(&column.left_border_rgb);
            let right = if index + 1 == date_count {
                Some(left)
            } else {
                None
            };
            let mut format = date_vertical_borders(Format::new(), left, right);
            if column.non_working {
                if payload.gray_header_only {
                    format = format.set_background_color(non_working);
                }
            } else if let Some(fill) = row_fill {
                format = format.set_background_color(fill);
            }
            worksheet
                .write_string_with_format(row, col as u16, "", &format)
                .map_err(|e| e.to_string())?;
        }
        row += 1;
    }

    for mark in &payload.milestone_marks {
        let col = left_count + mark.col_index as usize;
        worksheet
            .write_string_with_format(mark.row, col as u16, &mark.character, &Format::new())
            .map_err(|e| e.to_string())?;
    }

    worksheet
        .set_freeze_panes(payload.freeze_row, payload.freeze_col as u16)
        .map_err(|e| e.to_string())?;

    for shape in &payload.shapes {
        insert_shape(worksheet, shape)?;
    }

    let bytes = workbook.save_to_buffer().map_err(|e| e.to_string())?;
    let bytes = crate::excel_drawing_patch::patch_excel_drawings(bytes, payload)?;
    if bytes.len() > MAX_EXCEL_BYTES {
        return Err("保存する内容が大きすぎます（上限 10 MB）".to_string());
    }
    Ok(bytes)
}

fn insert_shape(worksheet: &mut Worksheet, shape: &ExcelExportShape) -> Result<(), String> {
    let (width_px, height_px) =
        shape_pixel_dimensions(shape.width_px, shape.height_px);
    if let Some(text) = &shape.text {
        let font_color = parse_color(shape.text_rgb.as_deref().unwrap_or("000000"));
        let textbox = Shape::textbox()
            .set_text(text)
            .set_width(width_px)
            .set_height(height_px)
            .set_format(
                &ShapeFormat::new()
                    .set_solid_fill(
                        &ShapeSolidFill::new()
                            .set_color(parse_color(&shape.fill_rgb))
                            .set_transparency(shape.fill_transparency.unwrap_or(100)),
                    )
                    .set_no_line(),
            )
            .set_font(&ShapeFont::new().set_color(font_color).set_size(9.0))
            .set_object_movement(ObjectMovement::MoveAndSizeWithCells);
        worksheet
            .insert_shape_with_offset(
                shape.row,
                shape.anchor_col as u16,
                &textbox,
                shape.x_offset_px,
                shape.y_offset_px,
            )
            .map_err(|e: XlsxError| e.to_string())?;
        return Ok(());
    }

    let fill = parse_color(&shape.fill_rgb);
    let transparency = shape.fill_transparency.unwrap_or(0);
    let textbox = if shape.pattern == "tentative" {
        let fore = parse_color(shape.pattern_fore_rgb.as_deref().unwrap_or("000000"));
        Shape::textbox()
            .set_text("")
            .set_width(width_px)
            .set_height(height_px)
            .set_format(
                &ShapePatternFill::new()
                    .set_pattern(ShapePatternFillType::Dotted20Percent)
                    .set_background_color(fill)
                    .set_foreground_color(fore),
            )
            .set_object_movement(ObjectMovement::MoveAndSizeWithCells)
    } else {
        Shape::textbox()
            .set_text("")
            .set_width(width_px)
            .set_height(height_px)
            .set_format(
                &ShapeSolidFill::new()
                    .set_color(fill)
                    .set_transparency(transparency),
            )
            .set_object_movement(ObjectMovement::MoveAndSizeWithCells)
    };
    worksheet
        .insert_shape_with_offset(
            shape.row,
            shape.anchor_col as u16,
            &textbox,
            shape.x_offset_px,
            shape.y_offset_px,
        )
        .map_err(|e: XlsxError| e.to_string())?;
    Ok(())
}

fn truncate_sheet_title(title: &str) -> String {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return "Schedule".to_string();
    }
    if trimmed.len() <= 31 {
        return trimmed.to_string();
    }
    trimmed.chars().take(31).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::excel_book::{
        anchor_block_xml, anchor_from_inner, anchor_to_inner, bar_anchor_blocks,
        connector_anchor_blocks, connector_end_cxn_idx, connector_flip_h_v,
        connector_st_cxn_idx, drawing_xml, emu, line_anchor_blocks, milestone_merge_refs,
        parse_ext_cx_cy, parse_two_cell_anchors, read_zip_entry, sheet_xml,
        workbook_contains_text,
    };
    use crate::excel_drawing_patch::connector_snap_bounds_from_bar_blocks;

    fn minimal_payload() -> ExcelExportPayload {
        ExcelExportPayload {
            sheet_title: "Test".to_string(),
            preamble: "preamble".to_string(),
            freeze_row: 2,
            freeze_col: 4,
            left_headers: vec![
                "名前".into(),
                "開始".into(),
                "終了".into(),
                "ノート".into(),
            ],
            date_columns: vec![ExcelTimeColumn {
                start_iso: "2026-01-01".into(),
                end_exclusive_iso: "2026-01-02".into(),
                header_label: "1/1".into(),
                non_working: false,
                left_border_rgb: "D8DCE3".into(),
            }],
            milestone_rows: vec![],
            rows: vec![ExcelExportRow {
                kind: "task".into(),
                cells: vec![
                    "Task".into(),
                    "01/01".into(),
                    "01/02".into(),
                    "".into(),
                ],
                name_overdue: false,
                name_indent: 2,
                name_bold: false,
                name_text_rgb: "1F2937".into(),
                row_fill_rgb: None,
            }],
            connectors: vec![],
            today_line: None,
            shapes: vec![ExcelExportShape {
                row: 2,
                anchor_col: 4,
                x_offset_px: 0,
                y_offset_px: 4,
                width_px: 48,
                height_px: 14,
                fill_rgb: "8A94A6".into(),
                pattern: "solid".into(),
                pattern_fore_rgb: None,
                fill_transparency: None,
                text: None,
                text_rgb: None,
            }],
            milestone_marks: vec![],
            header_gray_rgb: "F4F5F8".into(),
            non_working_fill_rgb: "F4F5F8".into(),
            category_heading_fill_rgb: "F8F9FB".into(),
            table_border_rgb: "E3E6EB".into(),
            summary_gap_lines: vec![],
            summary_caps: vec![],
            overdue_name_rgb: "C4351A".into(),
            gray_header_only: true,
            note_wrap_column_index: Some(3),
            todos_wrap_column_index: None,
            date_column_width_px: 48,
            body_row_height_px: 22,
            header_row_height_px: 22,
        }
    }

    #[test]
    fn write_excel_bytes_produces_xlsx() {
        let bytes = write_excel_bytes(&minimal_payload()).expect("write");
        assert!(bytes.len() > 100);
        assert_eq!(bytes[0], 0x50);
        assert_eq!(bytes[1], 0x4b);
    }

    #[test]
    fn task_row_fill_rgb_in_styles_and_bar_unchanged() {
        let mut payload = minimal_payload();
        payload.rows[0].row_fill_rgb = Some("FEF3C7".into());
        payload.date_columns = vec![
            ExcelTimeColumn {
                start_iso: "2026-01-02".into(),
                end_exclusive_iso: "2026-01-03".into(),
                header_label: "1/2".into(),
                non_working: false,
                left_border_rgb: "D8DCE3".into(),
            },
            ExcelTimeColumn {
                start_iso: "2026-01-03".into(),
                end_exclusive_iso: "2026-01-04".into(),
                header_label: "1/3".into(),
                non_working: true,
                left_border_rgb: "D8DCE3".into(),
            },
        ];
        let bytes = write_excel_bytes(&payload).expect("write");
        let styles = read_zip_entry(&bytes, "xl/styles.xml").expect("styles");
        assert!(
            styles.contains("FEF3C7"),
            "row fill should appear in styles"
        );
        assert!(
            styles.contains("F4F5F8"),
            "non-working fill should remain in styles"
        );
        let bar_block = bar_anchor_blocks(&drawing_xml(&bytes))
            .into_iter()
            .next()
            .expect("bar");
        assert!(
            bar_block.contains("8A94A6"),
            "bar fill should stay status color"
        );
    }

    #[test]
    fn screen_gridlines_are_off() {
        let bytes = write_excel_bytes(&minimal_payload()).expect("write");
        let sheet = sheet_xml(&bytes);
        assert!(sheet.contains("showGridLines=\"0\""));
    }

    #[test]
    fn shape_pixel_dimensions_clamps_thin_lines() {
        assert_eq!(shape_pixel_dimensions(2, 40), (5, 40));
        assert_eq!(shape_pixel_dimensions(40, 2), (40, 5));
        assert_eq!(shape_pixel_dimensions(100, 3), (100, 5));
        assert_eq!(shape_pixel_dimensions(48, 14), (48, 14));
    }

    #[test]
    fn thin_shape_in_xlsx_is_not_default_textbox_size() {
        let mut payload = minimal_payload();
        payload.shapes = vec![ExcelExportShape {
            row: 2,
            anchor_col: 4,
            x_offset_px: 0,
            y_offset_px: 0,
            width_px: 2,
            height_px: 40,
            fill_rgb: "FF0000".into(),
            pattern: "solid".into(),
            pattern_fore_rgb: None,
            fill_transparency: None,
            text: None,
            text_rgb: None,
        }];
        let bytes = write_excel_bytes(&payload).expect("write");
        let xml = drawing_xml(&bytes);
        let bar_xml = anchor_block_xml(&xml, 0).expect("bar anchor");
        assert!(bar_xml.contains("cx=\"47625\""));
        assert!(bar_xml.contains("cy=\"381000\""));
        assert!(!bar_xml.contains("cx=\"1828800\""));
    }

    fn second_task_shape() -> ExcelExportShape {
        ExcelExportShape {
            row: 3,
            anchor_col: 5,
            x_offset_px: 0,
            y_offset_px: 4,
            width_px: 48,
            height_px: 14,
            fill_rgb: "8A94A6".into(),
            pattern: "solid".into(),
            pattern_fore_rgb: None,
            fill_transparency: None,
            text: None,
            text_rgb: None,
        }
    }

    fn two_task_payload(straight: bool) -> ExcelExportPayload {
        let mut payload = minimal_payload();
        payload.rows.push(ExcelExportRow {
            kind: "task".into(),
            cells: vec!["Next".into(), "01/02".into(), "01/02".into(), "".into()],
            name_overdue: false,
            name_indent: 2,
            name_bold: false,
            name_text_rgb: "1F2937".into(),
            row_fill_rgb: None,
        });
        payload.shapes.push(second_task_shape());
        payload.connectors.push(ExcelExportConnector {
            from_shape_index: 0,
            to_shape_index: 1,
            stroke_rgb: "8A94A6".into(),
            broken: false,
            straight,
            bent_adj1: 50_000,
        });
        payload
    }

    #[test]
    fn bar_anchor_matches_payload_pixels() {
        let payload = minimal_payload();
        let shape = &payload.shapes[0];
        let bytes = write_excel_bytes(&payload).expect("write");
        let xml = drawing_xml(&bytes);
        let bar_block = bar_anchor_blocks(&xml).into_iter().next().expect("bar");
        let bar = parse_two_cell_anchors(&xml)
            .into_iter()
            .find(|a| a.is_bar)
            .expect("bar anchor");
        assert_eq!(bar.from_col, shape.anchor_col);
        assert_eq!(bar.from_row, shape.row);
        assert_eq!(bar.from_col_off, emu(shape.x_offset_px));
        assert_eq!(bar.from_row_off, emu(shape.y_offset_px));
        let (cx, cy) = parse_ext_cx_cy(&bar_block).expect("ext");
        assert_eq!(cx, emu(shape.width_px));
        assert_eq!(cy, emu(shape.height_px));
        assert!(!bar.dotted_pattern);
        assert!(bar_block.contains(&format!("val=\"{}\"", shape.fill_rgb)));
    }

    #[test]
    fn bar_tentative_pattern_in_xlsx() {
        let mut payload = minimal_payload();
        payload.shapes[0].pattern = "tentative".into();
        payload.shapes[0].pattern_fore_rgb = Some("818492".into());
        let bytes = write_excel_bytes(&payload).expect("write");
        let bar_block = bar_anchor_blocks(&drawing_xml(&bytes))
            .into_iter()
            .next()
            .expect("bar");
        assert!(bar_block.contains("pct20"));
        assert!(bar_block.contains("val=\"818492\""));
    }

    #[test]
    fn connector_snaps_straight_between_two_bars() {
        let payload = two_task_payload(true);
        let bytes = write_excel_bytes(&payload).expect("write");
        let xml = drawing_xml(&bytes);
        let bars = bar_anchor_blocks(&xml);
        assert_eq!(bars.len(), 2);
        let connectors = connector_anchor_blocks(&xml);
        assert_eq!(connectors.len(), 1);
        let connector = &connectors[0];
        assert_eq!(connector_st_cxn_idx(connector), Some(3));
        assert_eq!(connector_end_cxn_idx(connector), Some(1));
        assert!(connector.contains("straightConnector1"));
        assert!(connector.contains("type=\"triangle\""));
        let (exp_from, exp_to, flip_h, flip_v) =
            connector_snap_bounds_from_bar_blocks(&bars[0], &bars[1], payload.body_row_height_px)
                .expect("snap");
        assert_eq!(connector_flip_h_v(connector), (flip_h, flip_v));
        assert_eq!(anchor_from_inner(connector).as_deref(), Some(exp_from.as_str()));
        assert_eq!(anchor_to_inner(connector).as_deref(), Some(exp_to.as_str()));
    }

    #[test]
    fn connector_snaps_bent_between_two_rows() {
        let payload = two_task_payload(false);
        let bytes = write_excel_bytes(&payload).expect("write");
        let xml = drawing_xml(&bytes);
        let bars = bar_anchor_blocks(&xml);
        let connectors = connector_anchor_blocks(&xml);
        assert_eq!(connectors.len(), 1);
        let connector = &connectors[0];
        assert!(connector.contains("bentConnector3"));
        let (exp_from, exp_to, exp_flip_h, exp_flip_v) =
            connector_snap_bounds_from_bar_blocks(&bars[0], &bars[1], payload.body_row_height_px)
                .expect("snap");
        assert_eq!(anchor_from_inner(connector).as_deref(), Some(exp_from.as_str()));
        assert_eq!(anchor_to_inner(connector).as_deref(), Some(exp_to.as_str()));
        assert_eq!(connector_flip_h_v(connector), (exp_flip_h, exp_flip_v));
    }

    #[test]
    fn connector_omitted_when_bar_anchor_is_missing() {
        let mut payload = minimal_payload();
        payload.connectors.push(ExcelExportConnector {
            from_shape_index: 0,
            to_shape_index: 3,
            stroke_rgb: "8A94A6".into(),
            broken: false,
            straight: true,
            bent_adj1: 50_000,
        });
        let bytes = write_excel_bytes(&payload).expect("write");
        assert!(connector_anchor_blocks(&drawing_xml(&bytes)).is_empty());
    }

    #[test]
    fn today_line_matches_payload() {
        let mut payload = minimal_payload();
        let line = ExcelExportTodayLine {
            row: 2,
            anchor_col: 4,
            x_offset_px: 10,
            height_px: 22,
            stroke_rgb: "E07B20".into(),
        };
        payload.today_line = Some(line);
        let line = payload.today_line.as_ref().expect("line");
        let bytes = write_excel_bytes(&payload).expect("write");
        let xml = drawing_xml(&bytes);
        let blocks = line_anchor_blocks(&xml);
        assert_eq!(blocks.len(), 1);
        let block = &blocks[0];
        let from = anchor_from_inner(block).expect("from");
        assert!(from.contains(&format!("<xdr:col>{}</xdr:col>", line.anchor_col)));
        assert!(from.contains(&format!(
            "<xdr:colOff>{}</xdr:colOff>",
            emu(line.x_offset_px)
        )));
        assert!(from.contains(&format!("<xdr:row>{}</xdr:row>", line.row)));
        assert!(block.contains(&format!("val=\"{}\"", line.stroke_rgb)));
        let (_, cy) = parse_ext_cx_cy(block).expect("ext");
        assert_eq!(cy, emu(line.height_px));
    }

    #[test]
    fn today_line_absent_when_payload_has_none() {
        let payload = minimal_payload();
        let bytes = write_excel_bytes(&payload).expect("write");
        assert!(line_anchor_blocks(&drawing_xml(&bytes)).is_empty());
    }

    #[test]
    fn milestone_group_merge_and_diamond_column() {
        let mut payload = minimal_payload();
        let group = "ReleaseMilestone".to_string();
        payload.milestone_rows.push(ExcelMilestoneRow {
            name: group.clone(),
            marks: vec![MilestoneMark { col_index: 0 }],
        });
        payload.milestone_marks.push(MilestoneMarkCell {
            row: 1,
            col_index: 0,
            character: "◆ Release".into(),
        });
        let bytes = write_excel_bytes(&payload).expect("write");
        assert!(workbook_contains_text(&bytes, &group));
        let sheet = sheet_xml(&bytes);
        let merges = milestone_merge_refs(&sheet);
        assert_eq!(merges.len(), 1);
        assert!(merges[0].starts_with("A2:"));
        assert!(sheet.contains("r=\"E2\""));
    }

    #[test]
    fn column_width_change_moves_bar_width_only() {
        let mut narrow = minimal_payload();
        narrow.date_column_width_px = 48;
        narrow.shapes[0].width_px = 48;
        let mut wide = minimal_payload();
        wide.date_column_width_px = 80;
        wide.shapes[0].width_px = 80;
        let narrow_xml = drawing_xml(&write_excel_bytes(&narrow).expect("write"));
        let wide_xml = drawing_xml(&write_excel_bytes(&wide).expect("write"));
        let narrow_bar = bar_anchor_blocks(&narrow_xml)[0].clone();
        let wide_bar = bar_anchor_blocks(&wide_xml)[0].clone();
        let (narrow_cx, narrow_cy) = parse_ext_cx_cy(&narrow_bar).expect("cx");
        let (wide_cx, wide_cy) = parse_ext_cx_cy(&wide_bar).expect("cx");
        assert_ne!(narrow_cx, wide_cx);
        assert_eq!(narrow_cy, wide_cy);
        assert_eq!(line_anchor_blocks(&narrow_xml).len(), line_anchor_blocks(&wide_xml).len());
    }

    #[test]
    fn row_height_change_moves_vertical_offsets_only() {
        let mut short = minimal_payload();
        short.body_row_height_px = 22;
        short.shapes[0].y_offset_px = 4;
        let mut tall = minimal_payload();
        tall.body_row_height_px = 30;
        tall.shapes[0].y_offset_px = 8;
        tall.today_line = Some(ExcelExportTodayLine {
            row: 2,
            anchor_col: 4,
            x_offset_px: 0,
            height_px: 30,
            stroke_rgb: "E07B20".into(),
        });
        short.today_line = Some(ExcelExportTodayLine {
            row: 2,
            anchor_col: 4,
            x_offset_px: 0,
            height_px: 22,
            stroke_rgb: "E07B20".into(),
        });
        let short_xml = drawing_xml(&write_excel_bytes(&short).expect("write"));
        let tall_xml = drawing_xml(&write_excel_bytes(&tall).expect("write"));
        let short_bar = parse_two_cell_anchors(&short_xml)
            .into_iter()
            .find(|a| a.is_bar)
            .expect("bar");
        let tall_bar = parse_two_cell_anchors(&tall_xml)
            .into_iter()
            .find(|a| a.is_bar)
            .expect("bar");
        assert_ne!(short_bar.from_row_off, tall_bar.from_row_off);
        let short_line = line_anchor_blocks(&short_xml)[0].clone();
        let tall_line = line_anchor_blocks(&tall_xml)[0].clone();
        let (_, short_cy) = parse_ext_cx_cy(&short_line).expect("cy");
        let (_, tall_cy) = parse_ext_cx_cy(&tall_line).expect("cy");
        assert_ne!(short_cy, tall_cy);
        let (short_cx, _) = parse_ext_cx_cy(&bar_anchor_blocks(&short_xml)[0]).expect("cx");
        let (tall_cx, _) = parse_ext_cx_cy(&bar_anchor_blocks(&tall_xml)[0]).expect("cx");
        assert_eq!(short_cx, tall_cx);
    }

    #[test]
    fn summary_gap_line_spans_date_columns() {
        let mut payload = minimal_payload();
        payload.summary_gap_lines.push(ExcelExportSummaryGapLine {
            row: 2,
            anchor_col: 4,
            x_offset_px: 0,
            y_offset_px: 10,
            width_px: 240,
            stroke_rgb: "D5DBE3".into(),
        });
        payload.summary_caps.push(ExcelExportSummaryCap {
            row: 2,
            anchor_col: 8,
            x_offset_px: 43,
            y_offset_px: 12,
            size_px: 5,
            side: "right".into(),
            fill_rgb: "8A94A6".into(),
        });
        let bytes = write_excel_bytes(&payload).expect("write");
        let xml = drawing_xml(&bytes);
        let gap = xml
            .split("Summary gap")
            .nth(1)
            .expect("gap anchor");
        assert!(gap.contains("<xdr:col>9</xdr:col>"));
        assert!(gap.contains("cx=\"2286000\""));
        assert!(xml.contains("prst=\"rtTriangle\""));
        assert!(xml.contains("id=\"3\""));
        assert!(xml.contains("id=\"4\""));
        assert!(!xml.contains("id=\"2\" name=\"Summary"));
    }

    #[test]
    fn stroke_color_change_updates_connector_rgb_only() {
        let mut a = two_task_payload(true);
        let mut b = two_task_payload(true);
        a.connectors[0].stroke_rgb = "AABBCC".into();
        b.connectors[0].stroke_rgb = "112233".into();
        let a_block = connector_anchor_blocks(&drawing_xml(
            &write_excel_bytes(&a).expect("write"),
        ))[0]
            .clone();
        let b_block = connector_anchor_blocks(&drawing_xml(
            &write_excel_bytes(&b).expect("write"),
        ))[0]
            .clone();
        assert!(a_block.contains("val=\"AABBCC\""));
        assert!(b_block.contains("val=\"112233\""));
        assert_eq!(connector_st_cxn_idx(&a_block), connector_st_cxn_idx(&b_block));
        assert_eq!(connector_end_cxn_idx(&a_block), connector_end_cxn_idx(&b_block));
    }
}
