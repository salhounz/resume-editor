# Resume Editor

A local browser app for editing, previewing, and saving a one-page resume PDF. The browser handles editing and PDF generation; a small Node.js backend serves the app and saves versioned PDFs. No database or build step is required.

## Install and first-use walkthrough (8 steps)

1. **Install Node.js.** Install Node.js 22 or newer with npm from [nodejs.org](https://nodejs.org/). Open a terminal and check that both commands work:

   ```sh
   node --version
   npm --version
   ```

2. **Open the project.** Download or clone this repository, then open a terminal in the `resume-editor` folder containing [package.json](./package.json):

   ```sh
   cd path/to/resume-editor
   ```

   Replace the example path with your local project path. Run all commands below from this folder.

3. **Install dependencies.** Run:

   ```sh
   npm install
   ```

   This installs the backend dependency, Express, into the generated `node_modules` folder. Installation does not start the app or change your resume content.

4. **Find your way around.** [backend/](./backend/) contains the server and PDF disk storage. [public/](./public/) contains the browser interface, styles, and JavaScript. [default-resume.json](./public/data/default-resume.json) is the editable starting template. The `saved-resumes` folder is created beside these folders when you first save a PDF. The file map below explains each module.

5. **Start the app.** Run:

   ```sh
   npm start
   ```

   Leave the terminal running and open [http://localhost:3000](http://localhost:3000). Use the server URL instead of opening the HTML file directly. To restart automatically after backend edits, use `npm run dev` instead.

6. **Build your resume.** Select **Start Building** for the seven-section guided editor, or select a section to begin there. **Next** advances through the sections; **Finish** or closing the editor refreshes the preview. **Full Resume Text** lets you edit the complete source. Changes are stored as a browser draft, so reloading the same browser and address restores your work.

7. **Save, download, or print.** Review the preview and one-page checks. **Save Resume** stores a versioned PDF on the server as `saved-resumes/Your-Name-Resume-V1.pdf`, then `V2`, and so on, without overwriting earlier versions. **Download PDF** downloads a PDF to your browser's download location. **Print PDF** opens the browser print dialog. Downloading and printing do not create additional server copies. If the overflow dialog appears, shorten the content and check the preview again.

8. **Reset or stop.** The reset arrow beside the app title restores the JSON template and replaces the current browser draft; saved PDFs remain intact. To customize future defaults, edit [default-resume.json](./public/data/default-resume.json), refresh the app, and select reset. Stop the server with **Ctrl+C** in its terminal; use `npm start` to return later.

## Project map

```text
resume-editor/
??? backend/
?   ??? server.js              Serve the app and handle PDF save requests
?   ??? pdf-storage.js         Sanitize filenames and save numbered PDF versions
??? public/
?   ??? index.html            Application markup
?   ??? css/
?   ?   ??? app.css           Interface, dialogs and shared base styles
?   ?   ??? resume-layout.css Resume typography, spacing and page fitting
?   ?   ??? print.css         Print-specific style overrides
?   ??? data/
?   ?   ??? default-resume.json Starting and reset content
?   ??? js/
?       ??? app.js            Load defaults and initialize the editor
?       ??? editor.js         Fields, dialogs, guided editing and action wiring
?       ??? resume-text.js    Convert between editor fields and source text
?       ??? resume-parser.js  Parse source text into resume data
?       ??? resume-preview.js Preview markup and one-page fit measurements
?       ??? resume-pdf.js     Generate, download and print PDFs
?       ??? draft-storage.js  Read and write browser drafts
?       ??? resume-api.js     Send PDFs to the backend
?       ??? package.json      Mark browser JavaScript as ES modules for Node tools
??? saved-resumes/             Generated PDFs; created on first save, ignored by Git
??? tests/
?   ??? pdf-storage.test.js    Existing PDF storage checks
??? package.json              Dependencies and start commands
??? package-lock.json         Locked dependency versions
??? README.md
```

Browser code stays in [public/js/](./public/js/); backend code stays in [backend/](./backend/). The save endpoint is `POST /api/resumes` and saved PDF URLs start with `/saved-resumes/`.

## Defaults and saved work

The JSON template contains plain text fields for contact details and each editable section. Keep all existing keys and use strings, including empty strings for optional sections. The app loads this file once per page load and uses it for both first use and reset. An existing browser draft takes precedence until you reset it.

Drafts live in browser local storage; PDFs live on the server's disk. Keep the same browser and URL to continue a draft. Changing the hostname or port creates a different browser storage location. PDFs are excluded from Git; copy the generated `saved-resumes` folder separately when moving or backing up your work.

If upgrading an older checkout with an `artifacts` folder, stop the server and rename that folder to `saved-resumes` before restarting. Preserve the existing PDF filenames so numbering continues. If both folders already exist, copy files individually and resolve filename conflicts without overwriting PDFs.

## Troubleshooting

- **PowerShell blocks npm:** use `npm.cmd install`, `npm.cmd start`, or `npm.cmd run dev`.
- **Port 3000 is already in use:** stop the other server, or choose another port. In PowerShell, run `$env:PORT = 3001` followed by `npm start`; in macOS/Linux shells, run `PORT=3001 npm start`. Open the matching URL printed in the terminal.
- **The app cannot load defaults:** check that the JSON is valid and contains the expected text fields, then refresh. The startup message appears below the action buttons.
- **Saving fails:** keep the backend running and ensure the project folder is writable. Check the terminal for the error.

## Resume format

The resume uses Times New Roman, a single column, conventional section headings, and plain text skills. The template avoids tables, graphics, skill ratings, and decorative elements. Review the content and exported PDF before submitting a resume; the on-screen checks are layout and content hints, not an ATS certification.
