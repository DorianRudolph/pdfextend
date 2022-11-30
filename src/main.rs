use clap::{Parser, ValueEnum};
use indicatif::ProgressBar;
use pdfium_render::prelude::*;
use std::{
    env, fmt,
    path::{Path, PathBuf},
};

#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, ValueEnum, Debug)]
enum Unit {
    Mm,
    Cm,
    Inches,
    Points,
}

#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, ValueEnum, Debug)]
enum LineType {
    Lines,
    Squares,
}

#[derive(Copy, Clone, Debug)]
struct Color(PdfColor);

impl fmt::Display for Color {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(
            f,
            "#{:02X}{:02X}{:02X}",
            self.0.red(),
            self.0.green(),
            self.0.blue()
        )
    }
}

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to input PDF file
    input: String,

    /// Path to output PDF file
    output: String,

    /// Extend document by <LEFT> to the left
    #[arg(short, long, default_value_t = 0., value_parser = float_parser)]
    left: f32,

    /// Extend document by <RIGHT> to the right
    #[arg(short, long, default_value_t = 0., value_parser = float_parser)]
    right: f32,

    /// Extend document by <TOP> to the top
    #[arg(short, long, default_value_t = 0., value_parser = float_parser)]
    top: f32,

    /// Extend document by <BOTTOM> to the bottom
    #[arg(short, long, default_value_t = 0., value_parser = float_parser)]
    bottom: f32,

    /// Spacing between grid lines [default: 5 mm]
    #[arg(short, long, value_parser = float_parser)]
    spacing: Option<f32>,

    /// Line width [default: 0.1 mm]
    #[arg(short = 'w', long, value_parser = float_parser)]
    line_width: Option<f32>,

    /// Unit of the numeric parameters (points = inches/72)
    #[arg(short, long, default_value_t = Unit::Mm, value_enum)]
    unit: Unit,

    /// Add grid to the extended margins
    #[arg(short, long, value_enum)]
    grid: Option<LineType>,

    /// Append an additional page with grid to the document
    #[arg(short, long, default_value_t = false)]
    extra_page: bool,

    /// Swap <LEFT> and <RIGHT> for even pages
    #[arg(short, long, default_value_t = false)]
    mirror: bool,

    /// Color of the grid lines (format: #A0B0C0 or #ABC for RGB, #A0 or #A for grayscale, # is optional)
    #[arg(short, long, default_value_t = Color(PdfColor::new(0xf0, 0xf0, 0xf0, 0xff)), value_parser=color_parser)]
    color: Color,
}

struct ExtendParams {
    extend: PdfRect,
    spacing: PdfPoints,
    line_width: PdfPoints,
    grid: Option<LineType>,
    color: PdfColor,
    extra_page: bool,
    mirror: bool,
}

fn color_parser(s: &str) -> Result<Color, String> {
    let s = s.trim_start_matches("#");
    let l = s.len();
    if !(l == 1 || l == 2 || l == 3 || l == 6) {
        return Err("Invalid color".to_string());
    }
    let x = u32::from_str_radix(s, 16)
        .map_err(|_| format!("`{}` is not a valid hexadecimal number", s))?;
    let (r, g, b) = match l {
        1 => (x << 4, x << 4, x << 4),
        2 => (x, x, x),
        3 => ((x & 0xf00) >> 4, (x & 0xf0), (x & 0xf) << 4),
        _ => ((x & 0xff0000) >> 16, (x & 0xff00) >> 8, x & 0xff),
    };
    Ok(Color(PdfColor::new(r as u8, g as u8, b as u8, 255)))
}

fn float_parser(s: &str) -> Result<f32, String> {
    let num: f32 = s.parse().map_err(|_| "Not a valid floating point number")?;
    if num < 0. {
        return Err("No negative numbers allowed".to_string());
    } else if num > 1e6 {
        return Err("Number too big".to_string());
    }
    Ok(num)
}

fn local_pdfium_path() -> String {
    let mut path = env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(Path::to_owned))
        .unwrap_or(PathBuf::from("."));
    let pdfium_name = Pdfium::pdfium_platform_library_name();
    path.push(pdfium_name);
    path.to_str().unwrap().to_string()
}

fn make_grid<'a>(
    doc: &PdfDocument<'a>,
    rect_inner: Option<&PdfRect>,
    rect_outer: &PdfRect,
    params: &ExtendParams,
) -> Result<PdfPagePathObject<'a>, PdfiumError> {
    let width = params.line_width;
    let spacing = params.spacing;

    let mut path = PdfPagePathObject::new(
        doc,
        rect_outer.left,
        rect_outer.top,
        Some(params.color),
        Some(width),
        None,
    )?;
    path.set_line_cap(PdfPageObjectLineCap::Butt)?;

    let mut draw_line = |x1, y1, x2, y2| {
        path.move_to(x1, y1)?;
        path.line_to(x2, y2)
    };

    if let Some(grid) = params.grid {
        let mut y = rect_outer.top - spacing;
        while y > rect_outer.bottom {
            match rect_inner {
                Some(rect_inner) if y <= rect_inner.top && y >= rect_inner.bottom => {
                    if rect_outer.left < rect_inner.left {
                        draw_line(rect_outer.left, y, rect_inner.left, y)?;
                    }
                    if rect_outer.right > rect_inner.right {
                        draw_line(rect_inner.right, y, rect_outer.right, y)?;
                    }
                }
                _ => draw_line(rect_outer.left, y, rect_outer.right, y)?,
            }
            y -= spacing;
        }

        if grid == LineType::Squares {
            let mut x = rect_outer.left + spacing;
            while x < rect_outer.right {
                match rect_inner {
                    Some(rect_inner) if x >= rect_inner.left && x <= rect_inner.right => {
                        if rect_outer.top > rect_inner.top {
                            draw_line(x, rect_outer.top, x, rect_inner.top)?;
                        }
                        if rect_outer.bottom < rect_inner.bottom {
                            draw_line(x, rect_outer.bottom, x, rect_inner.bottom)?;
                        }
                    }
                    _ => draw_line(x, rect_outer.top, x, rect_outer.bottom)?,
                }
                x += spacing;
            }
        }
    }

    Ok(path)
}

fn extend_pdf(input: &str, output: &str, params: &ExtendParams) -> Result<(), PdfiumError> {
    let pdfium = Pdfium::new(
        Pdfium::bind_to_library(local_pdfium_path())
            .or_else(|_| Pdfium::bind_to_system_library())?,
    );
    let doc = pdfium.load_pdf_from_file(input, None)?;

    let page_count = doc.pages().len();
    let pb = ProgressBar::new(page_count as u64);

    for (i, mut page) in doc.pages().iter().enumerate() {
        pb.inc(1);

        page.set_content_regeneration_strategy(PdfPageContentRegenerationStrategy::AutomaticOnDrop);
        let boundaries = page.boundaries_mut();

        let rect_old = boundaries.bounding()?.bounds;
        let mut rect_new = rect_old;

        if params.mirror && i % 2 == 1 {
            rect_new.left -= params.extend.right;
            rect_new.right += params.extend.left;
        } else {
            rect_new.left -= params.extend.left;
            rect_new.right += params.extend.right;
        }
        rect_new.top += params.extend.top;
        rect_new.bottom -= params.extend.bottom;

        // Not sure if we need to set all boxes
        // https://opensource.adobe.com/dc-acrobat-sdk-docs/standards/pdfstandards/pdf/PDF32000_2008.pdf
        boundaries.set_crop(rect_new)?;
        boundaries.set_media(rect_new)?;
        boundaries.set_bleed(rect_new)?;
        boundaries.set_art(rect_new)?;
        boundaries.set_trim(rect_new)?;

        let grid = make_grid(&doc, Some(&rect_old), &rect_new, params)?;
        page.objects_mut().add_path_object(grid)?;
    }

    if params.extra_page {
        let bounds = doc
            .pages()
            .get(page_count - 1)?
            .boundaries()
            .bounding()?
            .bounds;
        let mut new_page = doc
            .pages()
            .create_page_at_end(PdfPagePaperSize::Custom(bounds.width(), bounds.height()))?;
        let new_bounds = new_page.boundaries().bounding()?.bounds;
        let grid = make_grid(&doc, None, &new_bounds, params)?;
        new_page.objects_mut().add_path_object(grid)?;
    }

    pb.finish_and_clear();
    doc.save_to_file(output)
}

fn main() {
    let args = Args::parse();
    let to_points = |x| match args.unit {
        Unit::Mm => PdfPoints::from_mm(x),
        Unit::Cm => PdfPoints::from_cm(x),
        Unit::Inches => PdfPoints::from_inches(x),
        Unit::Points => PdfPoints::new(x),
    };

    let params = ExtendParams {
        extend: PdfRect::new(
            to_points(args.bottom),
            to_points(args.left),
            to_points(args.top),
            to_points(args.right),
        ),
        spacing: args.spacing.map(to_points).unwrap_or(PdfPoints::from_mm(5.)),
        line_width: args.line_width.map(to_points).unwrap_or(PdfPoints::from_mm(0.1)),
        grid: args.grid,
        color: args.color.0,
        extra_page: args.extra_page,
        mirror: args.mirror,
    };

    extend_pdf(&args.input, &args.output, &params).unwrap()
}
