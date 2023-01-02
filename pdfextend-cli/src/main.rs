/*
  PDFextend: add margins with grid lines for annotation to a PDF document.
  Copyright (C) 2023  Dorian Rudolph

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
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
    let pb = ProgressBar::new(page_count as u64 + args.extra_page as u64);

    extend_pdf(&mut doc, &args, Some(&|_| pb.inc(1))).unwrap();

    pb.set_style(ProgressStyle::with_template("{wide_msg}").unwrap());
    pb.set_message("Saving...");
    doc.save_to_file(&args.output).expect("Failed to save PDF");
    pb.finish_and_clear();
}
