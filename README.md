# Resume Editor

A self-contained browser app for editing, previewing, and saving a one-page ATS-friendly resume PDF.

## Usage

1. Install dependencies with `npm install`.
2. Start the app with `npm start`.
3. Open the printed URL, edit any resume section, and select **Save Resume** to save the draft and refresh the preview.

Use **Download PDF** for an automatic, dynamically named PDF download. Use **Print PDF** to open the matching print view.

Closing a section editor applies the latest changes to the resume preview without creating a PDF artifact. Selecting **Save Resume** writes a versioned PDF under `artifacts/`; files are never overwritten, and versions increment as `Name-Resume-V1.pdf`, `Name-Resume-V2.pdf`, and so on. Download and Print create their requested output without archiving an additional copy.

## Project Structure

- `src/` contains the Express server and versioned artifact storage.
- `public/` contains the browser application.
- `artifacts/` contains generated PDF artifacts.
- `public/js/config/` contains the canonical default resume.
- `public/js/resume/` contains parsing, rendering, and one-page fitting logic.
- `public/js/services/` contains PDF, artifact API, and draft-storage services.
- `public/js/ui/` contains editor workflow and DOM behavior.
- `test/` contains Node.js tests.

The generated resume uses:

- Times New Roman throughout the resume preview.
- A single-column, text-first layout.
- Standard resume headings: Profile, Work Experience, Education, and Skills.
- Reverse chronological experience parsing when dates are present.
- Compact one-page spacing suitable for print or PDF export.

## ATS Notes

The template intentionally avoids tables, graphics, text boxes, columns, skill ratings, and decorative elements. It keeps section headings conventional and uses common body sizing so the exported text remains readable by applicant tracking systems.
