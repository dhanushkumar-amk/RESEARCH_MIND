import io
import pdfplumber
import PyPDF2
from docx import Document
import openpyxl
from fastapi import HTTPException

class ExtractorService:
    def extract_text(self, file_bytes: bytes, file_type: str) -> str:
        """
        Main entry point for document extraction.
        Routes to the correct extractor based on file type.
        """
        file_type = file_type.lower().strip(".")
        
        if file_type == "pdf":
            return self.extract_pdf(file_bytes)
        elif file_type == "docx":
            return self.extract_docx(file_bytes)
        elif file_type == "xlsx":
            return self.extract_xlsx(file_bytes)
        elif file_type in {"txt", "text"}:
            return self.extract_txt(file_bytes)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type for text extraction: {file_type}"
            )

    def extract_pdf(self, file_bytes: bytes) -> str:
        """
        Step 2: PDF extraction using pdfplumber with PyPDF2 as a fallback.
        """
        text = ""
        # Try pdfplumber first (better formatting)
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"pdfplumber failed: {e}. Trying fallback PyPDF2...")
            # Fallback to PyPDF2
            try:
                reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            except Exception as fe:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to extract text from PDF: {str(fe)}"
                )

        clean_text = text.strip()
        if not clean_text:
            raise HTTPException(
                status_code=400,
                detail="PDF appears to be empty or contains only scanned images (no selectable text)."
            )
        return clean_text

    def extract_docx(self, file_bytes: bytes) -> str:
        """
        Step 3: Microsoft Word (.docx) extraction.
        """
        try:
            doc = Document(io.BytesIO(file_bytes))
            text = []
            for paragraph in doc.paragraphs:
                if paragraph.text:
                    text.append(paragraph.text)
            
            # Extract from tables as well
            for table in doc.tables:
                for row in table.rows:
                    row_text = [cell.text for cell in row.cells if cell.text]
                    if row_text:
                        text.append(" | ".join(row_text))
                        
            clean_text = "\n".join(text).strip()
            if not clean_text:
                raise HTTPException(status_code=400, detail="Word document is empty.")
            return clean_text
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to extract text from Word document: {str(e)}"
            )

    def extract_xlsx(self, file_bytes: bytes) -> str:
        """
        Step 3: Microsoft Excel (.xlsx) extraction.
        """
        try:
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            text_lines = []
            
            for sheet in wb.worksheets:
                text_lines.append(f"--- Sheet: {sheet.title} ---")
                for row in sheet.iter_rows(values_only=True):
                    # Filter out completely empty rows
                    row_values = [str(cell).strip() if cell is not None else "" for cell in row]
                    if any(row_values):
                        text_lines.append(" | ".join(row_values))
                        
            clean_text = "\n".join(text_lines).strip()
            if not clean_text:
                raise HTTPException(status_code=400, detail="Excel sheet is empty.")
            return clean_text
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to extract text from Excel document: {str(e)}"
            )

    def extract_txt(self, file_bytes: bytes) -> str:
        """
        Step 3: Plain Text (.txt) extraction with encoding detection.
        """
        encodings = ["utf-8", "latin-1", "utf-16", "cp1252"]
        for encoding in encodings:
            try:
                text = file_bytes.decode(encoding)
                clean_text = text.strip()
                if not clean_text:
                    raise HTTPException(status_code=400, detail="Text file is empty.")
                return clean_text
            except UnicodeDecodeError:
                continue
        
        raise HTTPException(
            status_code=400,
            detail="Failed to decode text file. Ensure it is encoded in UTF-8 or standard ASCII."
        )
