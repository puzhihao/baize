package ai

import (
	"context"
	"fmt"
)

// Manager holds all available providers and routes requests
type Manager struct {
	providers map[string]Provider
	def       string
}

func NewManager(deepseekKey, openaiKey, claudeKey, minimaxKey, defaultModel string) *Manager {
	m := &Manager{
		providers: make(map[string]Provider),
		def:       defaultModel,
	}
	if deepseekKey != "" {
		m.providers["deepseek"] = NewDeepSeek(deepseekKey)
	}
	if openaiKey != "" {
		m.providers["openai"] = NewOpenAI(openaiKey)
	}
	if claudeKey != "" {
		m.providers["claude"] = NewClaude(claudeKey)
	}
	if minimaxKey != "" {
		m.providers["minimax"] = NewMiniMax(minimaxKey)
	}
	return m
}

func (m *Manager) Get(name string) (Provider, error) {
	if name == "" {
		name = m.def
	}
	p, ok := m.providers[name]
	if !ok {
		// fallback to first available
		for _, p := range m.providers {
			return p, nil
		}
		return nil, fmt.Errorf("no AI provider configured")
	}
	return p, nil
}

func (m *Manager) Analyze(ctx context.Context, model, resumeText, jdText, promptTemplate string) (*AnalysisResult, error) {
	p, err := m.Get(model)
	if err != nil {
		return nil, err
	}
	return p.Analyze(ctx, resumeText, jdText, promptTemplate)
}

func (m *Manager) Stream(ctx context.Context, model, prompt string) (<-chan string, error) {
	p, err := m.Get(model)
	if err != nil {
		return nil, err
	}
	return p.Stream(ctx, prompt)
}

func (m *Manager) AvailableModels() []string {
	names := make([]string, 0, len(m.providers))
	for k := range m.providers {
		names = append(names, k)
	}
	return names
}
