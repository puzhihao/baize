package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const claudeBaseURL = "https://api.anthropic.com/v1"

type ClaudeProvider struct {
	apiKey string
	model  string
}

func NewClaude(apiKey string) *ClaudeProvider {
	return &ClaudeProvider{apiKey: apiKey, model: "claude-sonnet-4-6"}
}

func (p *ClaudeProvider) Name() string { return "claude" }

func (p *ClaudeProvider) Analyze(ctx context.Context, resumeText, jdText, promptTemplate string) (*AnalysisResult, error) {
	prompt := buildAnalysisPrompt(resumeText, jdText, promptTemplate)
	respText, err := p.complete(ctx, prompt, false)
	if err != nil {
		return nil, err
	}
	jsonStr := extractJSON(respText)
	var result AnalysisResult
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, fmt.Errorf("parse AI response failed: %w\nraw: %s", err, respText)
	}
	return &result, nil
}

func (p *ClaudeProvider) Stream(ctx context.Context, prompt string) (<-chan string, error) {
	ch := make(chan string, 64)
	go func() {
		defer close(ch)
		if err := p.streamComplete(ctx, prompt, ch); err != nil {
			ch <- fmt.Sprintf("[ERROR] %s", err.Error())
		}
	}()
	return ch, nil
}

type claudeRequest struct {
	Model     string         `json:"model"`
	MaxTokens int            `json:"max_tokens"`
	System    string         `json:"system"`
	Messages  []chatMessage  `json:"messages"`
	Stream    bool           `json:"stream"`
}

type claudeResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
}

func (p *ClaudeProvider) complete(ctx context.Context, prompt string, stream bool) (string, error) {
	reqBody := claudeRequest{
		Model:     p.model,
		MaxTokens: 4096,
		Stream:    stream,
		System:    "你是一位专业的简历优化顾问，擅长分析和优化中文简历，请严格按照JSON格式返回分析结果。",
		Messages:  []chatMessage{{Role: "user", Content: prompt}},
	}
	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", claudeBaseURL+"/messages", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("x-api-key", p.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Claude API error %d: %s", resp.StatusCode, string(b))
	}
	var cr claudeResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return "", err
	}
	if len(cr.Content) == 0 {
		return "", fmt.Errorf("empty response from Claude")
	}
	return cr.Content[0].Text, nil
}

func (p *ClaudeProvider) streamComplete(ctx context.Context, prompt string, ch chan<- string) error {
	reqBody := claudeRequest{
		Model:     p.model,
		MaxTokens: 4096,
		Stream:    true,
		System:    "你是一位专业的简历优化顾问，请提供具体、可操作的优化建议。",
		Messages:  []chatMessage{{Role: "user", Content: prompt}},
	}
	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", claudeBaseURL+"/messages", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("x-api-key", p.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		var event struct {
			Type  string `json:"type"`
			Delta struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"delta"`
		}
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			continue
		}
		if event.Type == "content_block_delta" && event.Delta.Text != "" {
			ch <- event.Delta.Text
		}
	}
	return scanner.Err()
}
