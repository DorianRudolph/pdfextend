use pdfium_render::prelude::*;

use wasm_bindgen::prelude::*;

use web_sys::ImageData;

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

    // Report labels, boundaries, and metrics for each page to the console.

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

/// Downloads the given url, opens it as a PDF document, then returns the ImageData for
/// the given page index using the given bitmap dimensions.
#[cfg(target_arch = "wasm32")]
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