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

fn extend_pdf(input: &str, output: &str) -> Result<(), PdfiumError> {
    let pdfium = Pdfium::new(
        Pdfium::bind_to_library(local_pdfium_path())
            .or_else(|_| Pdfium::bind_to_system_library())?,
    );
    let doc = pdfium.load_pdf_from_file(input, None)?;

    let page_count = doc.pages().len() as u64;
    let pb = ProgressBar::new(page_count);

    for (_i, mut page) in doc.pages().iter().enumerate() {
        pb.inc(1);
        page.set_content_regeneration_strategy(PdfPageContentRegenerationStrategy::AutomaticOnDrop);
        let boundaries = page.boundaries_mut();
        let mut rect = boundaries.crop().or_else(|_| boundaries.media())?.bounds;
        rect.left -= PdfPoints::from_mm(50.);

        boundaries.set_crop(rect)?;
        boundaries.set_media(rect)?;
    }
    pb.finish_and_clear();
    doc.save_to_file(output)
}

fn main() {
    let args = Args::parse();

    println!("Input: {}\nOutput: {}", args.input, args.output);
    extend_pdf(&args.input, &args.output).unwrap()
}
