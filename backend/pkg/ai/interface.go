package ai

import "context"

// AnalysisResult is the structured result from AI resume analysis
type AnalysisResult struct {
	TotalScore   int              `json:"total_score"`
	Dimensions   ScoreDimensions  `json:"dimensions"`
	Issues       []Issue          `json:"issues"`
	Suggestions  []Suggestion     `json:"suggestions"`
	JDMatchScore int              `json:"jd_match_score,omitempty"`
	JDMissingKeys []string        `json:"jd_missing_keys,omitempty"`
}

type ScoreDimensions struct {
	ContentCompleteness       int `json:"content_completeness"`
	LanguageExpression        int `json:"language_expression"`
	StructureClarity          int `json:"structure_clarity"`
	KeywordDensity            int `json:"keyword_density"`
	AchievementQuantification int `json:"achievement_quantification"`
}

type Issue struct {
	Section  string `json:"section"`
	Level    string `json:"level"` // error, warning, suggestion
	Message  string `json:"message"`
}

type Suggestion struct {
	Section  string `json:"section"`
	Original string `json:"original,omitempty"`
	Improved string `json:"improved"`
	Reason   string `json:"reason"`
}

// Provider defines the interface for AI providers
type Provider interface {
	Analyze(ctx context.Context, resumeText, jdText, promptTemplate string) (*AnalysisResult, error)
	Stream(ctx context.Context, prompt string) (<-chan string, error)
	Name() string
}
