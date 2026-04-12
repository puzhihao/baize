package parser

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/ledongthuc/pdf"
	"github.com/nguyenthenguyen/docx"
)

// ExtractText extracts plain text from PDF or DOCX file bytes
func ExtractText(data []byte, fileType string) (string, error) {
	switch strings.ToLower(fileType) {
	case "pdf":
		return extractPDF(data)
	case "docx":
		return extractDOCX(data)
	default:
		return "", fmt.Errorf("unsupported file type: %s", fileType)
	}
}

func extractPDF(data []byte) (string, error) {
	r, err := pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("open PDF: %w", err)
	}
	var sb strings.Builder
	for i := 1; i <= r.NumPage(); i++ {
		page := r.Page(i)
		if page.V.IsNull() {
			continue
		}
		text, err := page.GetPlainText(nil)
		if err != nil {
			continue
		}
		sb.WriteString(text)
		sb.WriteString("\n")
	}
	return strings.TrimSpace(sb.String()), nil
}

func extractDOCX(data []byte) (string, error) {
	r, err := docx.ReadDocxFromMemory(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("open DOCX: %w", err)
	}
	defer r.Close()
	doc := r.Editable()
	content := doc.GetContent()
	// Strip XML tags
	var sb strings.Builder
	inTag := false
	for _, ch := range content {
		switch ch {
		case '<':
			inTag = true
		case '>':
			inTag = false
			sb.WriteRune(' ')
		default:
			if !inTag {
				sb.WriteRune(ch)
			}
		}
	}
	return strings.TrimSpace(sb.String()), nil
}
