package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

const minimaxBaseURL = "https://api.minimaxi.com/v1"

type MiniMaxProvider struct {
	apiKey string
	model  string
}

func NewMiniMax(apiKey string) *MiniMaxProvider {
	return &MiniMaxProvider{apiKey: apiKey, model: "MiniMax-M2.7"}
}

func (p *MiniMaxProvider) Name() string { return "minimax" }

func (p *MiniMaxProvider) Analyze(ctx context.Context, resumeText, jdText, promptTemplate string) (*AnalysisResult, error) {
	withJD := jdText != ""
	log.Printf("[minimax] analyze start model=%s with_jd=%v", p.model, withJD)
	start := time.Now()

	prompt := buildAnalysisPrompt(resumeText, jdText, promptTemplate)
	respText, err := p.chatCompletion(context.TODO(), prompt)
	if err != nil {
		log.Printf("[minimax] analyze failed elapsed=%s err=%v", time.Since(start), err)
		return nil, err
	}

	jsonStr := extractJSON(respText)
	var result AnalysisResult
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		log.Printf("[minimax] parse response failed elapsed=%s err=%v", time.Since(start), err)
		return nil, fmt.Errorf("parse AI response failed: %w\nraw: %s", err, respText)
	}

	log.Printf("[minimax] analyze done elapsed=%s total_score=%d", time.Since(start), result.TotalScore)
	return &result, nil
}

func (p *MiniMaxProvider) Stream(ctx context.Context, prompt string) (<-chan string, error) {
	ch := make(chan string, 64)
	go func() {
		defer close(ch)
		if err := p.streamCompletion(ctx, prompt, ch); err != nil {
			ch <- fmt.Sprintf("[ERROR] %s", err.Error())
		}
	}()
	return ch, nil
}

func (p *MiniMaxProvider) chatCompletion(ctx context.Context, prompt string) (string, error) {
	reqBody := chatRequest{
		Model:  p.model,
		Stream: false,
		Messages: []chatMessage{
			{Role: "system", Content: "你是一位专业的简历优化顾问，擅长分析和优化中文简历，帮助求职者提升面试机会。请严格按照JSON格式返回分析结果。"},
			{Role: "user", Content: prompt},
		},
	}
	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", minimaxBaseURL+"/chat/completions", bytes.NewReader(body))
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
		return "", fmt.Errorf("MiniMax API error %d: %s", resp.StatusCode, string(b))
	}
	var cr chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return "", err
	}
	if len(cr.Choices) == 0 {
		return "", fmt.Errorf("empty response from MiniMax")
	}
	return cr.Choices[0].Message.Content, nil
}

func (p *MiniMaxProvider) streamCompletion(ctx context.Context, prompt string, ch chan<- string) error {
	reqBody := chatRequest{
		Model:  p.model,
		Stream: true,
		Messages: []chatMessage{
			{Role: "system", Content: "你是一位专业的简历优化顾问，擅长分析和优化中文简历，请提供具体、可操作的优化建议。"},
			{Role: "user", Content: prompt},
		},
	}
	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", minimaxBaseURL+"/chat/completions", bytes.NewReader(body))
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
