use clap::Parser;
use pdfium_render::prelude::*;
use std::{env, path::PathBuf};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to input PDF file
    input: String,

    /// Path to output PDF file
    output: String,
}

fn extend_pdf(input: &str, output: &str) -> Result<(), PdfiumError> {
    let pdfium = Pdfium::new(
        Pdfium::bind_to_library(Pdfium::pdfium_platform_library_name_at_path("./"))
            .or_else(|_| Pdfium::bind_to_system_library())?,
    );
    let doc = pdfium.load_pdf_from_file(input, None)?;
    for mut page in doc.pages().iter() {
        let bounds = page.boundaries_mut();
        let mut rect = bounds.crop().unwrap().bounds;
        // rect.left -= PdfPoints::from_mm(50.);
        // println!("{:?}", page.boundaries().media()?);
        // println!("{:?}", page.boundaries().media()?);
        // println!();
    }
    Ok(())
}

fn current_path() -> Option<PathBuf> {
    Some(env::current_exe().ok()?.parent()?.to_owned())
}

fn main() {
    let path = current_path().unwrap_or("./".into());
    println!("path: {}", path.display());
    println!("path2: {}", Pdfium::pdfium_platform_library_name_at_path(path.display()));
    let args = Args::parse();

    println!("Input: {}\nOutput: {}", args.input, args.output);
    extend_pdf(&args.input, &args.output).unwrap()
}
