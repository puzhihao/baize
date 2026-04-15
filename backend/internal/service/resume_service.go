package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"path/filepath"
	"strings"
	"time"

	apperrors "github.com/baize/backend/internal/errors"
	"github.com/baize/backend/internal/config"
	"github.com/baize/backend/internal/database"
	"github.com/baize/backend/internal/model"
	"github.com/baize/backend/pkg/ai"
	"github.com/baize/backend/pkg/parser"
	alioss "github.com/aliyun/aliyun-oss-go-sdk/oss"
	"gorm.io/gorm"
	"github.com/google/uuid"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// storageClient is a minimal interface for object storage operations.
type storageClient interface {
	PutObject(ctx context.Context, key string, data []byte, contentType string) error
	DeleteObject(ctx context.Context, key string) error
}

// ossStorage implements storageClient using Alibaba Cloud OSS SDK.
type ossStorage struct {
	bucket *alioss.Bucket
}

func (o *ossStorage) PutObject(_ context.Context, key string, data []byte, contentType string) error {
	return o.bucket.PutObject(key, bytes.NewReader(data), alioss.ContentType(contentType))
}

func (o *ossStorage) DeleteObject(_ context.Context, key string) error {
	return o.bucket.DeleteObject(key)
}

// s3Storage implements storageClient using aws-sdk-go-v2.
type s3Storage struct {
	client *s3.Client
	bucket string
}

func (s *s3Storage) PutObject(ctx context.Context, key string, data []byte, contentType string) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(s.bucket),
		Key:           aws.String(key),
		Body:          bytes.NewReader(data),
		ContentLength: aws.Int64(int64(len(data))),
		ContentType:   aws.String(contentType),
	})
	return err
}

func (s *s3Storage) DeleteObject(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	return err
}

type ResumeService struct {
	aiMgr   *ai.Manager
	storage storageClient
}

var ResumeServiceInstance *ResumeService

func InitResumeService(aiMgr *ai.Manager) {
	var storage storageClient

	if config.App.StorageProvider == "oss" {
		storage = initOSSStorage()
	} else {
		storage = initS3Storage()
	}

	ResumeServiceInstance = &ResumeService{aiMgr: aiMgr, storage: storage}
}

func initOSSStorage() storageClient {
	client, err := alioss.New(config.App.S3Endpoint, config.App.S3AccessKey, config.App.S3SecretKey)
	if err != nil {
		panic(fmt.Sprintf("init oss client failed: %v", err))
	}

	exist, err := client.IsBucketExist(config.App.S3Bucket)
	if err != nil {
		panic(fmt.Sprintf("check oss bucket failed: %v", err))
	}
	if !exist {
		if err := client.CreateBucket(config.App.S3Bucket); err != nil {
			panic(fmt.Sprintf("create oss bucket failed: %v", err))
		}
	}

	bucket, err := client.Bucket(config.App.S3Bucket)
	if err != nil {
		panic(fmt.Sprintf("get oss bucket failed: %v", err))
	}
	return &ossStorage{bucket: bucket}
}

func initS3Storage() storageClient {
	ctx := context.Background()
	cfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(config.App.S3Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			config.App.S3AccessKey, config.App.S3SecretKey, "",
		)),
	)
	if err != nil {
		panic(fmt.Sprintf("init s3 config failed: %v", err))
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = config.App.S3ForcePathStyle
		if config.App.S3Endpoint != "" {
			o.BaseEndpoint = aws.String(config.App.S3Endpoint)
		}
	})

	_, err = client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(config.App.S3Bucket),
	})
	if err != nil {
		createInput := &s3.CreateBucketInput{
			Bucket: aws.String(config.App.S3Bucket),
		}
		if config.App.S3Region != "us-east-1" {
			createInput.CreateBucketConfiguration = &s3types.CreateBucketConfiguration{
				LocationConstraint: s3types.BucketLocationConstraint(config.App.S3Region),
			}
		}
		if _, cerr := client.CreateBucket(ctx, createInput); cerr != nil {
			panic(fmt.Sprintf("create s3 bucket failed: %v", cerr))
		}
	}

	return &s3Storage{client: client, bucket: config.App.S3Bucket}
}

type UploadFileRequest struct {
	UserID   uint
	FileName string
	Data     []byte
	FileType string // pdf, docx
}

func (s *ResumeService) UploadFile(req UploadFileRequest) (*model.Resume, error) {
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(req.FileName), "."))
	if ext != "pdf" && ext != "docx" {
		return nil, errors.New("仅支持 PDF 和 DOCX 格式")
	}
	rawText, err := parser.ExtractText(req.Data, ext)
	if err != nil {
		return nil, fmt.Errorf("解析文件失败: %w", err)
	}

	objectName := fmt.Sprintf("resumes/%d/%s%s", req.UserID, uuid.NewString(), filepath.Ext(req.FileName))
	contentType := "application/pdf"
	if ext == "docx" {
		contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	}
	if err := s.storage.PutObject(context.Background(), objectName, req.Data, contentType); err != nil {
		return nil, fmt.Errorf("上传文件失败: %w", err)
	}

	title := strings.TrimSuffix(req.FileName, filepath.Ext(req.FileName))
	resume := &model.Resume{
		UserID:   req.UserID,
		Title:    title,
		FilePath: objectName,
		FileType: ext,
		RawText:  rawText,
		Status:   model.ResumeStatusReady,
	}
	if err := database.DB.Create(resume).Error; err != nil {
		return nil, err
	}
	s.saveVersion(resume, 0)
	return resume, nil
}

func (s *ResumeService) CreateFromText(userID uint, title, text string) (*model.Resume, error) {
	resume := &model.Resume{
		UserID:   userID,
		Title:    title,
		FileType: "text",
		RawText:  text,
		Status:   model.ResumeStatusReady,
	}
	if err := database.DB.Create(resume).Error; err != nil {
		return nil, err
	}
	s.saveVersion(resume, 0)
	return resume, nil
}

func (s *ResumeService) ListByUser(userID uint) ([]model.Resume, error) {
	var resumes []model.Resume
	err := database.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&resumes).Error
	return resumes, err
}

func (s *ResumeService) GetByID(id, userID uint) (*model.Resume, error) {
	var resume model.Resume
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&resume).Error; err != nil {
		return nil, errors.New("简历不存在")
	}
	return &resume, nil
}

func (s *ResumeService) DeleteResume(ctx context.Context, id, userID uint) error {
	resume, err := s.GetByID(id, userID)
	if err != nil {
		return err
	}
	// Delete file from object storage (best-effort, don't fail if already gone)
	if resume.FilePath != "" {
		_ = s.storage.DeleteObject(ctx, resume.FilePath)
	}
	// Delete related records then the resume itself
	database.DB.Where("resume_id = ?", id).Delete(&model.ResumeVersion{})
	database.DB.Where("resume_id = ?", id).Delete(&model.Analysis{})
	return database.DB.Delete(resume).Error
}

type AnalyzeRequest struct {
	ResumeID uint
	UserID   uint
	JDText   string
	Model    string
}

const freeMonthlyLimit = 3

func (s *ResumeService) Analyze(ctx context.Context, req AnalyzeRequest) (*model.Analysis, error) {
	log.Printf("[service.Analyze] start user_id=%d resume_id=%d model=%q with_jd=%v",
		req.UserID, req.ResumeID, req.Model, req.JDText != "")
	start := time.Now()

	var user model.User
	if err := database.DB.First(&user, req.UserID).Error; err != nil {
		log.Printf("[service.Analyze] user not found user_id=%d err=%v", req.UserID, err)
		return nil, errors.New("用户不存在")
	}
	if user.Tier == model.TierFree {
		var count int64
		now := time.Now().UTC()
		startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		database.DB.Model(&model.Analysis{}).
			Where("user_id = ? AND created_at >= ?", req.UserID, startOfMonth).
			Count(&count)
		if count >= freeMonthlyLimit {
			log.Printf("[service.Analyze] quota exceeded user_id=%d count=%d", req.UserID, count)
			return nil, fmt.Errorf("免费用户每月仅支持%d次分析，请升级Pro: %w", freeMonthlyLimit, apperrors.ErrQuotaExceeded)
		}
	}

	resume, err := s.GetByID(req.ResumeID, req.UserID)
	if err != nil {
		log.Printf("[service.Analyze] resume not found resume_id=%d err=%v", req.ResumeID, err)
		return nil, err
	}

	log.Printf("[service.Analyze] calling AI model=%q", req.Model)
	// 用脱离请求生命周期的 context：客户端断连不会中断 AI 调用和数据库写入
	aiCtx := context.WithoutCancel(ctx)

	// 从数据库读取自定义 Prompt（ID=1），不存在则传空串使用默认值
	var promptTemplate string
	var sp model.SystemPrompt
	if err := database.DB.First(&sp, 1).Error; err == nil {
		promptTemplate = sp.Content
	}

	result, err := s.aiMgr.Analyze(aiCtx, req.Model, resume.RawText, req.JDText, promptTemplate)
	if err != nil {
		log.Printf("[service.Analyze] AI call failed elapsed=%s err=%v", time.Since(start), err)
		return nil, fmt.Errorf("AI分析失败: %w", err)
	}
	log.Printf("[service.Analyze] AI call done elapsed=%s total_score=%d jd_match=%d",
		time.Since(start), result.TotalScore, result.JDMatchScore)

	detailJSON, _ := json.Marshal(result.Dimensions)
	issuesJSON, _ := json.Marshal(result.Issues)
	suggestionsJSON, _ := json.Marshal(result.Suggestions)
	missingJSON, _ := json.Marshal(result.JDMissingKeys)

	providerName := req.Model
	if providerName == "" {
		providerName = config.App.DefaultAIModel
	}

	analysis := &model.Analysis{
		ResumeID:      resume.ID,
		UserID:        req.UserID,
		TotalScore:    result.TotalScore,
		DetailScores:  string(detailJSON),
		Issues:        string(issuesJSON),
		Suggestions:   string(suggestionsJSON),
		JDText:        req.JDText,
		JDMatchScore:  result.JDMatchScore,
		JDMissingKeys: string(missingJSON),
		ModelUsed:     providerName,
	}
	if err := database.DB.Create(analysis).Error; err != nil {
		log.Printf("[service.Analyze] DB save failed elapsed=%s err=%v", time.Since(start), err)
		return nil, err
	}

	database.DB.Model(&model.User{}).Where("id = ?", req.UserID).
		UpdateColumn("analysis_used", gorm.Expr("analysis_used + 1"))

	s.saveVersion(resume, analysis.ID)
	log.Printf("[service.Analyze] done elapsed=%s analysis_id=%d", time.Since(start), analysis.ID)
	return analysis, nil
}

type AnalyzeStreamEvent struct {
	Type     string          // "token" | "result" | "error"
	Token    string
	Analysis *model.Analysis
	ErrMsg   string
}

func (s *ResumeService) AnalyzeStream(ctx context.Context, req AnalyzeRequest) (<-chan AnalyzeStreamEvent, error) {
	// Quota check (same as Analyze)
	var user model.User
	if err := database.DB.First(&user, req.UserID).Error; err != nil {
		return nil, errors.New("用户不存在")
	}
	if user.Tier == model.TierFree {
		var count int64
		now := time.Now().UTC()
		startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		database.DB.Model(&model.Analysis{}).
			Where("user_id = ? AND created_at >= ?", req.UserID, startOfMonth).
			Count(&count)
		if count >= freeMonthlyLimit {
			return nil, fmt.Errorf("免费用户每月仅支持%d次分析，请升级Pro: %w", freeMonthlyLimit, apperrors.ErrQuotaExceeded)
		}
	}

	resume, err := s.GetByID(req.ResumeID, req.UserID)
	if err != nil {
		return nil, err
	}

	// Load prompt template
	var promptTemplate string
	var sp model.SystemPrompt
	if err := database.DB.First(&sp, 1).Error; err == nil {
		promptTemplate = sp.Content
	}
	prompt := ai.BuildAnalysisPrompt(resume.RawText, req.JDText, promptTemplate)

	// Start AI stream
	tokenCh, err := s.aiMgr.Stream(ctx, req.Model, prompt)
	if err != nil {
		return nil, fmt.Errorf("AI分析失败: %w", err)
	}

	out := make(chan AnalyzeStreamEvent, 128)

	go func() {
		defer close(out)
		var buf strings.Builder

		for token := range tokenCh {
			buf.WriteString(token)
			out <- AnalyzeStreamEvent{Type: "token", Token: token}
		}

		// Parse and save
		result, err := ai.ParseAnalysisResult(buf.String())
		if err != nil {
			log.Printf("[service.AnalyzeStream] parse failed: %v\nraw: %s", err, buf.String())
			out <- AnalyzeStreamEvent{Type: "error", ErrMsg: "AI响应解析失败，请重试"}
			return
		}

		detailJSON, _ := json.Marshal(result.Dimensions)
		issuesJSON, _ := json.Marshal(result.Issues)
		suggestionsJSON, _ := json.Marshal(result.Suggestions)
		missingJSON, _ := json.Marshal(result.JDMissingKeys)

		providerName := req.Model
		if providerName == "" {
			providerName = config.App.DefaultAIModel
		}

		analysis := &model.Analysis{
			ResumeID:      resume.ID,
			UserID:        req.UserID,
			TotalScore:    result.TotalScore,
			DetailScores:  string(detailJSON),
			Issues:        string(issuesJSON),
			Suggestions:   string(suggestionsJSON),
			JDText:        req.JDText,
			JDMatchScore:  result.JDMatchScore,
			JDMissingKeys: string(missingJSON),
			ModelUsed:     providerName,
		}
		if err := database.DB.Create(analysis).Error; err != nil {
			out <- AnalyzeStreamEvent{Type: "error", ErrMsg: "保存分析结果失败"}
			return
		}

		database.DB.Model(&model.User{}).Where("id = ?", req.UserID).
			UpdateColumn("analysis_used", gorm.Expr("analysis_used + 1"))

		s.saveVersion(resume, analysis.ID)
		out <- AnalyzeStreamEvent{Type: "result", Analysis: analysis}
	}()

	return out, nil
}

func (s *ResumeService) GetAnalysis(id, userID uint) (*model.Analysis, error) {	var analysis model.Analysis
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&analysis).Error; err != nil {
		return nil, errors.New("分析记录不存在")
	}
	return &analysis, nil
}

func (s *ResumeService) DeleteAnalysis(id, userID uint) error {
	result := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Analysis{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("分析记录不存在")
	}
	return nil
}

func (s *ResumeService) ListVersions(resumeID, userID uint) ([]model.ResumeVersion, error) {
	if _, err := s.GetByID(resumeID, userID); err != nil {
		return nil, err
	}
	var versions []model.ResumeVersion
	err := database.DB.Where("resume_id = ?", resumeID).Order("version DESC").Find(&versions).Error
	return versions, err
}

type UserAnalysisItem struct {
	ID           uint      `json:"id"`
	ResumeID     uint      `json:"resume_id"`
	ResumeTitle  string    `json:"resume_title"`
	TotalScore   int       `json:"total_score"`
	JDMatchScore int       `json:"jd_match_score"`
	ModelUsed    string    `json:"model_used"`
	CreatedAt    time.Time `json:"created_at"`
}

func (s *ResumeService) ListAnalysesByUser(userID uint) ([]UserAnalysisItem, error) {
	type row struct {
		model.Analysis
		ResumeTitle string
	}
	var rows []row
	database.DB.Table("analyses").
		Select("analyses.*, resumes.title as resume_title").
		Joins("LEFT JOIN resumes ON resumes.id = analyses.resume_id").
		Where("analyses.user_id = ?", userID).
		Order("analyses.created_at DESC").
		Scan(&rows)

	items := make([]UserAnalysisItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, UserAnalysisItem{
			ID:           r.Analysis.ID,
			ResumeID:     r.Analysis.ResumeID,
			ResumeTitle:  r.ResumeTitle,
			TotalScore:   r.Analysis.TotalScore,
			JDMatchScore: r.Analysis.JDMatchScore,
			ModelUsed:    r.Analysis.ModelUsed,
			CreatedAt:    r.Analysis.CreatedAt,
		})
	}
	return items, nil
}

type GenerateRequest struct {
	UserID     uint
	Name       string
	Phone      string
	Email      string
	Position   string
	Education  string
	Experience string
	Skills     string
	Projects   string
	JDText     string
	Model      string
}

func (s *ResumeService) StreamGenerate(ctx context.Context, req GenerateRequest) (<-chan string, error) {
	// Build structured resume info from form fields
	var parts []string
	parts = append(parts, fmt.Sprintf("姓名：%s", req.Name))
	if req.Phone != "" {
		parts = append(parts, fmt.Sprintf("手机：%s", req.Phone))
	}
	if req.Email != "" {
		parts = append(parts, fmt.Sprintf("邮箱：%s", req.Email))
	}
	parts = append(parts, fmt.Sprintf("求职岗位：%s", req.Position))
	if req.Education != "" {
		parts = append(parts, fmt.Sprintf("\n【教育背景】\n%s", req.Education))
	}
	if req.Experience != "" {
		parts = append(parts, fmt.Sprintf("\n【工作经历】\n%s", req.Experience))
	}
	if req.Skills != "" {
		parts = append(parts, fmt.Sprintf("\n【技能特长】\n%s", req.Skills))
	}
	if req.Projects != "" {
		parts = append(parts, fmt.Sprintf("\n【项目经历】\n%s", req.Projects))
	}
	resumeInfo := strings.Join(parts, "\n")

	// Load generation prompt from DB, fallback to default
	var promptTemplate string
	var sp model.SystemPrompt
	if err := database.DB.Where("id = 2").First(&sp).Error; err == nil {
		promptTemplate = sp.Content
	}

	prompt := ai.BuildGenerationPrompt(resumeInfo, req.JDText, promptTemplate)
	return s.aiMgr.Stream(ctx, req.Model, prompt)
}

func (s *ResumeService) StreamSuggestions(ctx context.Context, resumeID, userID uint, jdText, modelName string) (<-chan string, error) {	resume, err := s.GetByID(resumeID, userID)
	if err != nil {
		return nil, err
	}
	prompt := fmt.Sprintf(`请对以下简历提供详细的逐条优化建议，重点指出可以改进的表达方式、缺失的信息以及量化成就的机会。用中文回答，条理清晰。

简历内容：
%s`, resume.RawText)
	if jdText != "" {
		prompt += fmt.Sprintf("\n\n目标职位：\n%s", jdText)
	}
	return s.aiMgr.Stream(ctx, modelName, prompt)
}

func (s *ResumeService) saveVersion(resume *model.Resume, analysisID uint) {
	var maxVer struct{ Version int }
	database.DB.Model(&model.ResumeVersion{}).
		Where("resume_id = ?", resume.ID).
		Select("COALESCE(MAX(version), 0) as version").
		Scan(&maxVer)
	v := &model.ResumeVersion{
		ResumeID:        resume.ID,
		Version:         maxVer.Version + 1,
		ContentSnapshot: resume.RawText,
		AnalysisID:      analysisID,
	}
	database.DB.Create(v)
}
