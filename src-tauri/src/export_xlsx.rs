use rust_xlsxwriter::{
    Color, Format, ObjectMovement, Shape, ShapePatternFill, ShapePatternFillType,
    ShapeSolidFill, Workbook, Worksheet, XlsxError,
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
    pub milestone_marks: Vec<MilestoneMarkCell>,
    #[allow(dead_code)]
    pub header_gray_rgb: String,
    pub non_working_fill_rgb: String,
    pub heading_fill_rgb: String,
    pub overdue_name_rgb: String,
    pub gray_header_only: bool,
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
    let heading_fill = parse_color(&payload.heading_fill_rgb);
    let overdue = parse_color(&payload.overdue_name_rgb);

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
            .set_column_width_pixels((left_count + col) as u16, 48)
            .map_err(|e| e.to_string())?;
    }

    worksheet
        .write_string(0, 0, &payload.preamble)
        .map_err(|e| e.to_string())?;
    worksheet
        .set_row_height(0, 30.0)
        .map_err(|e| e.to_string())?;

    let mut row = 1u32;
    for milestone in &payload.milestone_rows {
        worksheet
            .write_string(row, 0, &milestone.name)
            .map_err(|e| e.to_string())?;
        row += 1;
    }

    let header_row = row;
    let header_format = Format::new().set_bold();
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
        for (col, value) in export_row.cells.iter().enumerate() {
            let mut format = Format::new();
            if heading {
                format = format.set_background_color(heading_fill).set_bold();
            }
            if col == 0 && export_row.name_overdue {
                format = format.set_font_color(overdue);
            }
            worksheet
                .write_string_with_format(row, col as u16, value, &format)
                .map_err(|e| e.to_string())?;
        }
        if payload.gray_header_only {
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
        insert_bar_shape(worksheet, shape)?;
    }

    let bytes = workbook.save_to_buffer().map_err(|e| e.to_string())?;
    if bytes.len() > MAX_EXCEL_BYTES {
        return Err("保存する内容が大きすぎます（上限 10 MB）".to_string());
    }
    Ok(bytes)
}

fn insert_bar_shape(worksheet: &mut Worksheet, shape: &ExcelExportShape) -> Result<(), String> {
    let fill = parse_color(&shape.fill_rgb);
    let textbox = if shape.pattern == "tentative" {
        let fore = parse_color(shape.pattern_fore_rgb.as_deref().unwrap_or("000000"));
        Shape::textbox()
            .set_text("")
            .set_width(shape.width_px.max(1))
            .set_height(shape.height_px.max(1))
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
            .set_width(shape.width_px.max(1))
            .set_height(shape.height_px.max(1))
            .set_format(
                &ShapeSolidFill::new().set_color(fill),
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
            freeze_col: 7,
            left_headers: vec![
                "名前".into(),
                "担当".into(),
                "開始".into(),
                "終了".into(),
                "ステータス".into(),
                "先行".into(),
                "進捗".into(),
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
                    "未割当".into(),
                    "01/01".into(),
                    "01/02".into(),
                    "未着手".into(),
                    "".into(),
                    "0%".into(),
                ],
                name_overdue: false,
            }],
            shapes: vec![ExcelExportShape {
                row: 2,
                anchor_col: 7,
                x_offset_px: 0,
                y_offset_px: 4,
                width_px: 48,
                height_px: 14,
                fill_rgb: "8A94A6".into(),
                pattern: "solid".into(),
                pattern_fore_rgb: None,
            }],
            milestone_marks: vec![],
            header_gray_rgb: "F4F5F8".into(),
            non_working_fill_rgb: "F4F5F8".into(),
            heading_fill_rgb: "F8F9FB".into(),
            overdue_name_rgb: "C4351A".into(),
            gray_header_only: true,
        }
    }

    #[test]
    fn write_excel_bytes_produces_xlsx() {
        let bytes = write_excel_bytes(&minimal_payload()).expect("write");
        assert!(bytes.len() > 100);
        assert_eq!(bytes[0], 0x50);
        assert_eq!(bytes[1], 0x4b);
    }
}
