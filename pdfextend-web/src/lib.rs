use pdfextend_lib::{Args, Parser, PdfColor, PdfPageIndex, PdfRenderConfig, Pdfium, PdfiumError};
use wasm_bindgen::prelude::*;
use web_sys::{Blob, ImageData};

#[wasm_bindgen]
pub struct PdfExtendOut {
    file: Option<Blob>,
    preview: Option<ImageData>,
}

#[wasm_bindgen]
impl PdfExtendOut {
    pub fn get_file(&mut self) -> Option<Blob> {
        self.file.take()
    }
    pub fn get_preview(&mut self) -> Option<ImageData> {
        self.preview.take()
    }
}

fn err_to_str(e: PdfiumError) -> String {
    format!("{:?}", e)
}

#[wasm_bindgen]
pub async fn extend_pdf(cmd: String, blob: Blob) -> Result<PdfExtendOut, JsValue> {
    let args = cmd.split(' ');
    let args = Args::try_parse_from(args).map_err(|e| e.to_string())?;
    let bindings = Pdfium::bind_to_system_library().map_err(err_to_str)?;
    let pdfium = Pdfium::new(bindings);
    let mut doc = pdfium
        .load_pdf_from_blob(blob, None)
        .await
        .map_err(err_to_str)?;
    pdfextend_lib::extend_pdf(&mut doc, &args, None).map_err(err_to_str)?;
    let save = doc.save_to_blob().map_err(err_to_str)?;
    let page1 = doc.pages().first().map_err(err_to_str)?;
    let (w, h) = (page1.width().value, page1.height().value);
    let scale = (1e6 / (w * h)).sqrt(); // 1 Mpx
    let (w, h) = ((w * scale) as u16, (h * scale) as u16);
    let preview = page1
        .render_with_config(
            &PdfRenderConfig::new()
                .set_target_size(w, h)
                .render_form_data(true)
                .highlight_text_form_fields(PdfColor::SOLID_YELLOW.with_alpha(128))
                .highlight_checkbox_form_fields(PdfColor::SOLID_BLUE.with_alpha(128)),
        )
        .map_err(err_to_str)?
        .as_image_data()?;
    Ok(PdfExtendOut {
        file: Some(save),
        preview: Some(preview),
    })
}

#[wasm_bindgen]
pub async fn log_page_metrics_to_console(url: String) {
    // Our only option when targeting WASM is to bind to the "system library"
    // (a separate WASM build of Pdfium).

    let bindings = Pdfium::bind_to_system_library().unwrap();

    let pdfium = Pdfium::new(bindings);

    let document = pdfium.load_pdf_from_fetch(url, None).await.unwrap();

    // Output metadata and form information for the PDF file to the console.

    log::info!("PDF file version: {:#?}", document.version());

    log::info!("PDF metadata tags:");
    document
        .metadata()
        .iter()
        .enumerate()
        .for_each(|(index, tag)| log::info!("{}: {:#?} = {}", index, tag.tag_type(), tag.value()));

    match document.form() {
        Some(form) => log::info!(
            "PDF contains an embedded form of type {:#?}",
            form.form_type()
        ),
        None => log::info!("PDF does not contain an embedded form"),
    };

    document
        .pages()
        .iter()
        .enumerate()
        .for_each(|(index, page)| {
            if let Some(label) = page.label() {
                log::info!("Page {} has a label: {}", index, label);
            }

            log::info!(
                "Page {} width: {}, height: {}",
                index,
                page.width().value,
                page.height().value
            );

            for boundary in page.boundaries().iter() {
                log::info!(
                    "Page {} has defined {:#?} box ({}, {}) - ({}, {})",
                    index,
                    boundary.box_type,
                    boundary.bounds.left.value,
                    boundary.bounds.top.value,
                    boundary.bounds.right.value,
                    boundary.bounds.bottom.value,
                );
            }

            log::info!("Page {} has paper size {:#?}", index, page.paper_size());
        });
}

#[wasm_bindgen]
pub async fn get_image_data_for_page(
    url: String,
    index: PdfPageIndex,
    width: u16,
    height: u16,
) -> ImageData {
    Pdfium::new(Pdfium::bind_to_system_library().unwrap())
        .load_pdf_from_fetch(url, None)
        .await
        .unwrap()
        .pages()
        .get(index)
        .unwrap()
        .render_with_config(
            &PdfRenderConfig::new()
                .set_target_size(width, height)
                .render_form_data(true)
                .highlight_text_form_fields(PdfColor::SOLID_YELLOW.with_alpha(128))
                .highlight_checkbox_form_fields(PdfColor::SOLID_BLUE.with_alpha(128)),
        )
        .unwrap()
        .as_image_data()
        .unwrap()
}
