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

const openaiBaseURL = "https://api.openai.com/v1"

type OpenAIProvider struct {
	apiKey string
	model  string
}

func NewOpenAI(apiKey string) *OpenAIProvider {
	return &OpenAIProvider{apiKey: apiKey, model: "gpt-4o-mini"}
}

func (p *OpenAIProvider) Name() string { return "openai" }

func (p *OpenAIProvider) Analyze(ctx context.Context, resumeText, jdText, promptTemplate string) (*AnalysisResult, error) {
	prompt := buildAnalysisPrompt(resumeText, jdText, promptTemplate)
	respText, err := p.chatCompletion(ctx, prompt)
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

func (p *OpenAIProvider) Stream(ctx context.Context, prompt string) (<-chan string, error) {
	ch := make(chan string, 64)
	go func() {
		defer close(ch)
		if err := p.streamCompletion(ctx, prompt, ch); err != nil {
			ch <- fmt.Sprintf("[ERROR] %s", err.Error())
		}
	}()
	return ch, nil
}

func (p *OpenAIProvider) chatCompletion(ctx context.Context, prompt string) (string, error) {
	reqBody := chatRequest{
		Model:  p.model,
		Stream: false,
		Messages: []chatMessage{
			{Role: "system", Content: "你是一位专业的简历优化顾问，请严格按照JSON格式返回分析结果。"},
			{Role: "user", Content: prompt},
		},
	}
	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", openaiBaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+p.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("OpenAI API error %d: %s", resp.StatusCode, string(b))
	}
	var cr chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return "", err
	}
	if len(cr.Choices) == 0 {
		return "", fmt.Errorf("empty response from OpenAI")
	}
	return cr.Choices[0].Message.Content, nil
}

func (p *OpenAIProvider) streamCompletion(ctx context.Context, prompt string, ch chan<- string) error {
	reqBody := chatRequest{
		Model:  p.model,
		Stream: true,
		Messages: []chatMessage{
			{Role: "system", Content: "你是一位专业的简历优化顾问，请提供具体、可操作的优化建议。"},
			{Role: "user", Content: prompt},
		},
	}
	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", openaiBaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+p.apiKey)
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
		if data == "[DONE]" {
			break
		}
		var event struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			continue
		}
		if len(event.Choices) > 0 && event.Choices[0].Delta.Content != "" {
			ch <- event.Choices[0].Delta.Content
		}
	}
	return scanner.Err()
}
