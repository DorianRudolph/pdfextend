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
    None, Lines, Grid
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
    }
    pb.finish_and_clear();
    doc.save_to_file(output)
}

fn main() {
    let args = Args::parse();

    println!("Input: {}\nOutput: {}", args.input, args.output);
    extend_pdf(&args.input, &args.output).unwrap()
}
