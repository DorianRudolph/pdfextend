use clap::Parser;
use indicatif::ProgressBar;
use pdfium_render::prelude::*;
use std::{
    env,
    path::{Path, PathBuf},
};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to input PDF file
    input: String,

    /// Path to output PDF file
    output: String,
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

#[derive(Copy, Clone, Debug, PartialEq)]
enum LineType {
    Lines,
    Squares,
}

fn make_grid<'a>(
    doc: &PdfDocument<'a>,
    rect_inner: &PdfRect,
    rect_outer: &PdfRect,
    spacing: PdfPoints,
    width: PdfPoints,
    line_type: LineType,
) -> Result<PdfPagePathObject<'a>, PdfiumError> {
    let mut path = PdfPagePathObject::new(
        doc,
        rect_outer.left,
        rect_outer.top,
        Some(PdfColor::new(200, 200, 200, 255)),
        Some(width),
        None,
    )?;
    path.set_line_cap(PdfPageObjectLineCap::Butt)?;

    let mut draw_line = |x1, y1, x2, y2| {
        path.move_to(x1, y1)?;
        path.line_to(x2, y2)
    };

    let mut y = rect_outer.top - spacing;
    while y > rect_outer.bottom {
        if y > rect_inner.top || y < rect_inner.bottom {
            draw_line(rect_outer.left, y, rect_outer.right, y)?;
        } else if rect_outer.left < rect_inner.left {
            draw_line(rect_outer.left, y, rect_inner.left, y)?;
        } else if rect_outer.right > rect_inner.right {
            draw_line(rect_inner.right, y, rect_outer.right, y)?;
        }
        y -= spacing;
    }

    if line_type == LineType::Squares {
        let mut x = rect_outer.left + spacing;
        while x < rect_outer.right {
            if x < rect_inner.left || x > rect_inner.right {
                draw_line(x, rect_outer.top, x, rect_outer.bottom)?;
            } else if rect_outer.top > rect_inner.top {
                draw_line(x, rect_outer.top, x, rect_inner.top)?;
            } else if rect_outer.bottom < rect_inner.bottom {
                draw_line(x, rect_outer.bottom, x, rect_inner.bottom)?;
            }
            x += spacing;
        }
    }

    Ok(path)
}

fn extend_pdf(input: &str, output: &str) -> Result<(), PdfiumError> {
    let pdfium = Pdfium::new(
        Pdfium::bind_to_library(local_pdfium_path())
            .or_else(|_| Pdfium::bind_to_system_library())?,
    );
    let doc = pdfium.load_pdf_from_file(input, None)?;

    let page_count = doc.pages().len() as u64;
    let pb = ProgressBar::new(page_count);

    for (i, mut page) in doc.pages().iter().enumerate() {
        pb.inc(1);

        page.set_content_regeneration_strategy(PdfPageContentRegenerationStrategy::AutomaticOnDrop);
        let boundaries = page.boundaries_mut();

        // use crop box if available, otherwise use media box
        let rect_old = boundaries.crop().or_else(|_| boundaries.media())?.bounds;
        let mut rect_new = rect_old;

        if i % 2 == 0 {
            rect_new.left -= PdfPoints::from_mm(50.);
        } else {
            rect_new.right += PdfPoints::from_mm(50.);
        }

        // Not sure if we need to set all boxes
        // https://opensource.adobe.com/dc-acrobat-sdk-docs/standards/pdfstandards/pdf/PDF32000_2008.pdf
        boundaries.set_crop(rect_new)?;
        boundaries.set_media(rect_new)?;
        boundaries.set_bleed(rect_new)?;
        boundaries.set_art(rect_new)?;
        boundaries.set_trim(rect_new)?;

        let grid = make_grid(
            &doc,
            &rect_old,
            &rect_new,
            PdfPoints::from_mm(5.),
            PdfPoints::from_mm(0.2),
            LineType::Squares,
        )?;
        page.objects_mut().add_path_object(grid)?;

   }
    pb.finish_and_clear();
    doc.save_to_file(output)
}

fn main() {
    let args = Args::parse();

    println!("Input: {}\nOutput: {}", args.input, args.output);
    extend_pdf(&args.input, &args.output).unwrap()
}
