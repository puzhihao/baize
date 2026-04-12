package ai

import (
	"fmt"
	"strings"
)

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// DefaultAnalysisPromptTemplate is the fallback used when no custom prompt is stored.
// Placeholders: {{resume}} and {{jd_section}} (pre-formatted JD block or empty string).
const DefaultAnalysisPromptTemplate = `请对以下简历进行全面分析，返回严格的JSON格式结果（不要包含markdown代码块，直接返回JSON）：

## 简历内容
{{resume}}
{{jd_section}}
## 返回格式
{
  "total_score": <0-100的综合评分>,
  "dimensions": {
    "content_completeness": <内容完整度0-100>,
    "language_expression": <语言表达0-100>,
    "structure_clarity": <结构清晰度0-100>,
    "keyword_density": <关键词密度0-100>,
    "achievement_quantification": <成就量化0-100>
  },
  "issues": [
    {"section": "<模块名>", "level": "<error|warning|suggestion>", "message": "<问题描述>"}
  ],
  "suggestions": [
    {"section": "<模块名>", "original": "<原文片段，可选>", "improved": "<改进后的表达>", "reason": "<改进理由>"}
  ],
  "jd_match_score": <如有JD则填写0-100，否则不填>,
  "jd_missing_keys": ["<缺失关键词>"]
}`

// buildAnalysisPrompt builds the user prompt sent to the AI.
// If promptTemplate is empty, DefaultAnalysisPromptTemplate is used.
// Templates support {{resume}} and {{jd_section}} placeholders.
func buildAnalysisPrompt(resumeText, jdText, promptTemplate string) string {
	if promptTemplate == "" {
		promptTemplate = DefaultAnalysisPromptTemplate
	}
	jdSection := ""
	if jdText != "" {
		jdSection = fmt.Sprintf(`
## 目标职位描述 (JD)
%s

请额外分析简历与JD的匹配度，并在结果中填写 jd_match_score (0-100) 和 jd_missing_keys (缺失的关键技能/词汇列表)。`, jdText)
	}
	result := strings.ReplaceAll(promptTemplate, "{{resume}}", resumeText)
	result = strings.ReplaceAll(result, "{{jd_section}}", jdSection)
	return result
}

func extractJSON(s string) string {
	s = strings.TrimSpace(s)

	// Strip <think>...</think> blocks emitted by reasoning models (e.g. DeepSeek R1)
	for {
		start := strings.Index(s, "<think>")
		if start == -1 {
			break
		}
		end := strings.Index(s, "</think>")
		if end == -1 {
			// Unclosed tag — drop everything from <think> onward
			s = s[:start]
			break
		}
		s = s[:start] + s[end+len("</think>"):]
	}
	s = strings.TrimSpace(s)

	// Remove markdown code fences if present
	if idx := strings.Index(s, "```json"); idx != -1 {
		s = s[idx+7:]
		if end := strings.Index(s, "```"); end != -1 {
			s = s[:end]
		}
	} else if idx := strings.Index(s, "```"); idx != -1 {
		s = s[idx+3:]
		if end := strings.Index(s, "```"); end != -1 {
			s = s[:end]
		}
	}
	// Find first { and last }
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start != -1 && end != -1 && end > start {
		return s[start : end+1]
	}
	return s
}
