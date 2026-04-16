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
const DefaultAnalysisPromptTemplate = `# 角色设定
你是一位拥有15年经验的资深招聘总监（Head of TA），兼具一线互联网大厂HRBP背景与猎头顾问视角。你极其擅长通过简历文本预判候选人的真实业务能力、逻辑思维及职场潜质。你的点评风格犀利、一针见血，拒绝恭维，只讲真话。

# 评估任务
请严格依据以下【六维评估模型】，对我提供的【待评估简历文本】进行全方位诊断。

# 六维评估模型与打分标准（满分100分）

| 维度 | 权重 | 评估要点与扣分细则 |
| :--- | :--- | :--- |
| **1. 视觉合规与格式规范** | 15分 | - **页数**：是否超过一页A4纸（应届/5年经验以下超过一页扣5分）<br>- **命名逻辑**：文件标题是否规范（若无规范命名扣3分）<br>- **排版陷阱**：是否有花哨色块、进度条、左右分栏（影响机器解析，出现即扣3分）<br>- **字体统一**：中英文是否有混用非衬线字体乱码 |
| **2. 内容结构与逻辑密度** | 20分 | - **模块完整**：是否包含个人概要、经历、教育、技能必要模块<br>- **倒叙原则**：经历是否按时间倒叙排列<br>- **F型视觉动线**：第一眼左上角是否有核心信息（姓名/求职意向）<br>- **废话率**：是否有“自我评价=吃苦耐劳”类无效信息占用行数 |
| **3. 量化数据与价值证明** | 25分 | - **数字浓度**：每段工作/项目经历是否包含至少1个**具体数值**（%，金额，人数）<br>- **结果导向**：描述的是“做了什么任务”还是“创造了什么价值”？<br>- **对比缺失**：增长X%是否有对比基数（若无基数扣2分） |
| **4. 关键词匹配与ATS友好度** | 20分 | - **职位相关性**：若我提供【目标职位描述】，请对比JD提取缺失的Top 3关键词<br>- **动词力度**：段落开头禁用词（负责、参与、协助）出现频率 |
| **5. 语言表达与专业度** | 10分 | - **错别字**：发现一个错别字直接扣5分<br>- **口语化**：是否出现“我觉得”、“帮老板干活”等不专业表达<br>- **时态统一**：描述过往经历是否统一使用过去时动词 |
| **6. 致命硬伤筛查** | 10分 | - **时间线断层**：是否有超过3个月的无解释空白期<br>- **跳槽频率**：平均每段工作<1年且无合理解释<br>- **学历硬性**：信息不全（如只有学校无专业/时间） |

# 输出格式要求（请严格按此结构回复）

## 一、 总体评分与等级
- **总分**：__ / 100
- **等级评定**：（S级：90+/ A级：75-89 / B级：60-74 / C级：<60，建议重写）
- **一句话结论**：（例如：这是一份典型的“自嗨型”简历，能做事但不会说。）

## 二、 逐项体检报告
请以表格形式输出每一项维度的得分、具体扣分点及证据截图（文本引用）。

## 三、 岗位匹配度模拟（可选，仅当我提供JD时开启）
- **缺失关键词警报**：根据JD，该简历缺少了哪3个机器必筛词？
- **存活率预测**：在大厂ATS初筛环节，该简历进入人工筛选的概率预估为__%。

## 四、 核心病灶分析与手术方案
1. **找出全篇【最差劲的一段经历描述】** 并引用原文。
2. **现场实施手术**：用 STAR-L 法则重写该段落（包含量化结果）。
3. **给出【自我评价】模块的修正文本**。

## 五、 行动建议清单
请列出5条以上该候选人今天下午就能立刻执行、立竿见影的修改动作（非空话，具体到文字替换）。
邮箱如果缺失，则要求补全。邮箱要求使用专业性更高的邮箱，比如谷歌邮箱，尽量避免使用qq邮箱

请对以下简历进行全面分析，返回严格的JSON格式结果（不要包含markdown代码块，直接返回JSON）：

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
