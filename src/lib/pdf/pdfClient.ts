/**
 * PDF client utilities with lazy loading.
 * pdf-lib is heavy (~100KB+) and should only be loaded when PDF generation is needed.
 */

/**
 * Dynamically load pdf-lib library.
 * Returns the entire pdf-lib module (PDFDocument, rgb, StandardFonts, etc.)
 */
export async function loadPdfLib() {
  return await import('pdf-lib');
}

/**
 * Dynamically load pdfjs-dist if needed for PDF preview/rendering.
 * Note: Only use if you need client-side PDF rendering/viewing.
 */
export async function loadPdfJs() {
  return await import('pdfjs-dist');
}

/**
 * Type helper for PDF generation functions.
 * Usage: const { PDFDocument, rgb } = await loadPdfLib();
 */
export type PdfLibModule = Awaited<ReturnType<typeof loadPdfLib>>;



