use indicatif::{ProgressBar, ProgressStyle};
use pdfextend_lib::{extend_pdf, Args, Parser, Pdfium};
use std::{
    env,
    path::{Path, PathBuf},
};

fn local_pdfium_path() -> String {
    let mut path = env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(Path::to_owned))
        .unwrap_or_else(|| PathBuf::from("."));
    let pdfium_name = Pdfium::pdfium_platform_library_name();
    path.push(pdfium_name);
    path.to_str().unwrap().to_string()
}

fn main() {
    let args = Args::parse();

    let pdfium = Pdfium::new(
        Pdfium::bind_to_library(local_pdfium_path())
            .or_else(|_| Pdfium::bind_to_system_library())
            .expect("Failed to load PDFium"),
    );
    let mut doc = pdfium
        .load_pdf_from_file(&args.input, None)
        .expect("Failed to load PDF");

    let page_count = doc.pages().len();
    let pb = ProgressBar::new(page_count as u64);

    extend_pdf(&mut doc, &args, None).unwrap();

    pb.set_style(ProgressStyle::with_template("{wide_msg}").unwrap());
    pb.set_message("Saving...");
    doc.save_to_file(&args.output).expect("Failed to save PDF");
    pb.finish_and_clear();
}
