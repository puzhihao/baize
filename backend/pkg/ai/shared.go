package ai

import (
	"encoding/json"
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
	return BuildAnalysisPrompt(resumeText, jdText, promptTemplate)
}

// BuildAnalysisPrompt is the exported form of buildAnalysisPrompt.
func BuildAnalysisPrompt(resumeText, jdText, promptTemplate string) string {
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

// DefaultGenerationPromptTemplate is the fallback generation prompt.
// Placeholders: {{resume_info}} and {{jd_text}}.
const DefaultGenerationPromptTemplate = `# 角色设定
你是一位拥有10年以上经验的资深HRBP和职业规划师，曾供职于头部互联网大厂及500强外企。你极其擅长用STAR法则和量化数据重塑简历，且对ATS（申请人追踪系统）的关键词筛选机制了如指掌。

# 任务目标
请根据我提供的【原始简历内容】以及【目标岗位描述】，为我生成一份优化后的、排版专业、逻辑清晰、符合英文商务阅读习惯的【一页简历】。

# 核心指令约束
1. **量化原则**：必须将每一段工作/项目经历中的"动作"转化为"带数字的结果"。若无具体数字，请基于合理逻辑给出【占比预估/对比估算】（例如：提升效率约XX%，覆盖人数XX+）。
2. **STAR-L结构**：背景(S) + 任务(T) + 动作(A) + 结果(R) + 经验总结(L)。
3. **关键词匹配**：请提取【目标岗位描述】中的5-8个核心高频术语，并自然植入到优化后的简历内容中，以应对机器筛选。
4. **动词前置**：段落开头禁用"负责"、"参与"，改用"主导"、"从0到1搭建"、"重塑"、"优化"、"推动"。
5. **排版指令**：输出内容仅为纯文本的简历结构，但需明确标注各部分标题（如【教育背景】【工作经历】），并用分隔线示意一页内的视觉分区。**严禁输出进度条、左右分栏、彩色描述。**
6. **自我评价重构**：严禁出现"吃苦耐劳、性格开朗"等无效形容词。必须采用"能力标签 + 具体事实佐证"的结构。

# 输出格式要求
- 长度限制：控制在中文约800-1200字以内（严格对应一页A4纸密度）。
- 直接输出简历正文，不要添加任何解释性文字。

【目标岗位描述】：{{jd_text}}

【原始简历内容】：
{{resume_info}}`

// BuildGenerationPrompt builds the prompt for resume generation.
// If promptTemplate is empty, DefaultGenerationPromptTemplate is used.
func BuildGenerationPrompt(resumeInfo, jdText, promptTemplate string) string {
	if promptTemplate == "" {
		promptTemplate = DefaultGenerationPromptTemplate
	}
	jdContent := "（未提供）"
	if jdText != "" {
		jdContent = jdText
	}
	result := strings.ReplaceAll(promptTemplate, "{{resume_info}}", resumeInfo)
	result = strings.ReplaceAll(result, "{{jd_text}}", jdContent)
	return result
}

func extractJSON(s string) string {	s = strings.TrimSpace(s)

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

// ParseAnalysisResult extracts JSON from raw AI text and unmarshals it into AnalysisResult.
func ParseAnalysisResult(rawText string) (*AnalysisResult, error) {
	jsonStr := extractJSON(rawText)
	var result AnalysisResult
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, fmt.Errorf("parse analysis result: %w", err)
	}
	return &result, nil
}
