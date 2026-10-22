use rust_xlsxwriter::{
    Color, Format, ObjectMovement, Shape, ShapeFont, ShapeFormat, ShapePatternFill,
    ShapePatternFillType, ShapeSolidFill, Workbook, Worksheet, XlsxError,
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
    pub group_heading_fill_rgb: String,
    pub heading_text_rgb: String,
    pub overdue_name_rgb: String,
    pub gray_header_only: bool,
    pub note_wrap_column_index: Option<u32>,
    pub date_column_width_px: u32,
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

    let left_count = payload.left_headers.len();
    let date_count = payload.date_columns.len();
    let non_working = parse_color(&payload.non_working_fill_rgb);
    let category_heading_fill = parse_color(&payload.category_heading_fill_rgb);
    let group_heading_fill = parse_color(&payload.group_heading_fill_rgb);
    let heading_text = parse_color(&payload.heading_text_rgb);
    let overdue = parse_color(&payload.overdue_name_rgb);
    let note_wrap = payload.note_wrap_column_index;
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
    for milestone in &payload.milestone_rows {
        if left_count > 1 {
            worksheet
                .merge_range(row, 0, row, left_last_col, &milestone.name, &Format::new())
                .map_err(|e| e.to_string())?;
        } else {
            worksheet
                .write_string(row, 0, &milestone.name)
                .map_err(|e| e.to_string())?;
        }
        row += 1;
    }

    let header_row = row;
    let header_format = Format::new().set_bold();
    worksheet
        .set_row_height_pixels(header_row, if date_col_width >= 96 { 28 } else { 22 })
        .map_err(|e| e.to_string())?;
    for (col, label) in payload.left_headers.iter().enumerate() {
        worksheet
            .write_string_with_format(header_row, col as u16, label, &header_format)
            .map_err(|e| e.to_string())?;
    }
    for (index, column) in payload.date_columns.iter().enumerate() {
        let col = left_count + index;
        let mut format = Format::new().set_bold();
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
            .set_row_height_pixels(row, 22)
            .map_err(|e| e.to_string())?;
        let heading = export_row.kind == "category" || export_row.kind == "group";
        let heading_fill = if export_row.kind == "group" {
            group_heading_fill
        } else {
            category_heading_fill
        };
        for (col, value) in export_row.cells.iter().enumerate() {
            let mut format = Format::new();
            if heading {
                format = format
                    .set_background_color(heading_fill)
                    .set_bold()
                    .set_font_color(heading_text);
            }
            if col == 0 && export_row.name_overdue {
                format = format.set_font_color(overdue);
            }
            if note_wrap == Some(col as u32) {
                format = format.set_text_wrap();
            }
            worksheet
                .write_string_with_format(row, col as u16, value, &format)
                .map_err(|e| e.to_string())?;
        }
        if heading {
            for index in 0..date_count {
                let col = left_count + index;
                let format = Format::new()
                    .set_background_color(heading_fill)
                    .set_bold()
                    .set_font_color(heading_text);
                worksheet
                    .write_string_with_format(row, col as u16, "", &format)
                    .map_err(|e| e.to_string())?;
            }
        } else if payload.gray_header_only {
            for (index, column) in payload.date_columns.iter().enumerate() {
                if column.non_working {
                    let col = left_count + index;
                    let format = Format::new().set_background_color(non_working);
                    worksheet
                        .write_string_with_format(row, col as u16, "", &format)
                        .map_err(|e| e.to_string())?;
                }
            }
        }
        row += 1;
    }

    for mark in &payload.milestone_marks {
        let col = left_count + mark.col_index as usize;
        worksheet
            .write_string(mark.row, col as u16, &mark.character)
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
            group_heading_fill_rgb: "F3F5F8".into(),
            heading_text_rgb: "1F2937".into(),
            overdue_name_rgb: "C4351A".into(),
            gray_header_only: true,
            note_wrap_column_index: Some(3),
            date_column_width_px: 48,
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
        let cursor = std::io::Cursor::new(bytes);
        let mut archive = zip::ZipArchive::new(cursor).expect("zip");
        let mut drawing = archive
            .by_name("xl/drawings/drawing1.xml")
            .expect("drawing");
        let mut xml = String::new();
        std::io::Read::read_to_string(&mut drawing, &mut xml).expect("read");
        // 5px and 40px in EMU (9525 per px), not the 192×120 default (1828800×1143000).
        assert!(xml.contains("cx=\"47625\""));
        assert!(xml.contains("cy=\"381000\""));
        assert!(!xml.contains("cx=\"1828800\""));
    }

    #[test]
    fn connector_and_today_line_in_drawing_xml() {
        let mut payload = minimal_payload();
        payload.connectors.push(ExcelExportConnector {
            from_shape_index: 0,
            to_shape_index: 0,
            stroke_rgb: "3366CC".into(),
            broken: false,
            straight: true,
            bent_adj1: 50_000,
        });
        payload.today_line = Some(ExcelExportTodayLine {
            row: 2,
            anchor_col: 4,
            x_offset_px: 10,
            height_px: 22,
            stroke_rgb: "E07B20".into(),
        });
        let bytes = write_excel_bytes(&payload).expect("write");
        let cursor = std::io::Cursor::new(bytes);
        let mut archive = zip::ZipArchive::new(cursor).expect("zip");
        let mut drawing = archive
            .by_name("xl/drawings/drawing1.xml")
            .expect("drawing");
        let mut xml = String::new();
        std::io::Read::read_to_string(&mut drawing, &mut xml).expect("read");
        assert!(xml.contains("xdr:cxnSp"));
        assert!(xml.contains("straightConnector1"));
        assert!(xml.contains("idx=\"3\""));
        assert!(xml.contains("idx=\"1\""));
        assert!(xml.contains("type=\"triangle\""));
        assert!(xml.contains("prst=\"line\""));
        // Bar y 4px + height 14px → vertical center 11px from row top.
        assert!(xml.contains("<xdr:rowOff>104775</xdr:rowOff>"));
    }
}
