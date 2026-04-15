package service

import (
	"context"
	"errors"
	"time"

	"github.com/baize/backend/internal/database"
	"github.com/baize/backend/internal/model"
	"github.com/baize/backend/pkg/ai"
	"golang.org/x/crypto/bcrypt"
)

type AdminService struct{}

// ── Stats ──────────────────────────────────────────────────────────────────

type DailyCount struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type StatsResult struct {
	TotalUsers          int64                      `json:"total_users"`
	NewUsersThisMonth   int64                      `json:"new_users_this_month"`
	TotalResumes        int64                      `json:"total_resumes"`
	NewResumesThisMonth int64                      `json:"new_resumes_this_month"`
	TotalAnalyses       int64                      `json:"total_analyses"`
	AnalysesThisMonth   int64                      `json:"analyses_this_month"`
	AvgScore            float64                    `json:"avg_score"`
	ModelUsage          map[string]int64           `json:"model_usage"`
	TierBreakdown       map[string]int64           `json:"tier_breakdown"`
	DailyTrend          []DailyCount               `json:"daily_trend"`
	ModelDailyTrend     map[string][]DailyCount    `json:"model_daily_trend"`
}

func (s *AdminService) Stats(_ context.Context) (*StatsResult, error) {
	now := time.Now().UTC()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	var res StatsResult

	database.DB.Model(&model.User{}).Count(&res.TotalUsers)
	database.DB.Model(&model.User{}).Where("created_at >= ?", monthStart).Count(&res.NewUsersThisMonth)
	database.DB.Model(&model.Resume{}).Count(&res.TotalResumes)
	database.DB.Model(&model.Resume{}).Where("created_at >= ?", monthStart).Count(&res.NewResumesThisMonth)
	database.DB.Model(&model.Analysis{}).Count(&res.TotalAnalyses)
	database.DB.Model(&model.Analysis{}).Where("created_at >= ?", monthStart).Count(&res.AnalysesThisMonth)

	var avgScore *float64
	database.DB.Model(&model.Analysis{}).Select("AVG(total_score)").Scan(&avgScore)
	if avgScore != nil {
		res.AvgScore = *avgScore
	}

	// 模型使用分布
	var modelRows []struct {
		Model string
		Count int64
	}
	database.DB.Model(&model.Analysis{}).
		Select("model_used as model, count(*) as count").
		Group("model_used").
		Scan(&modelRows)
	res.ModelUsage = make(map[string]int64)
	for _, r := range modelRows {
		res.ModelUsage[r.Model] = r.Count
	}

	// Tier 分布
	var tierRows []struct {
		Tier  string
		Count int64
	}
	database.DB.Model(&model.User{}).
		Select("tier, count(*) as count").
		Group("tier").
		Scan(&tierRows)
	res.TierBreakdown = make(map[string]int64)
	for _, r := range tierRows {
		res.TierBreakdown[r.Tier] = r.Count
	}

	// 最近 30 天每日分析趋势
	var trendRows []struct {
		Date  string
		Count int64
	}
	database.DB.Model(&model.Analysis{}).
		Select("DATE(created_at) as date, count(*) as count").
		Where("created_at >= ?", now.AddDate(0, 0, -29)).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&trendRows)
	res.DailyTrend = make([]DailyCount, 0, len(trendRows))
	for _, r := range trendRows {
		res.DailyTrend = append(res.DailyTrend, DailyCount{Date: r.Date, Count: r.Count})
	}

	// 最近 30 天每日各模型调用趋势
	var modelTrendRows []struct {
		Date  string
		Model string
		Count int64
	}
	database.DB.Model(&model.Analysis{}).
		Select("DATE(created_at) as date, model_used as model, count(*) as count").
		Where("created_at >= ?", now.AddDate(0, 0, -29)).
		Group("DATE(created_at), model_used").
		Order("date ASC").
		Scan(&modelTrendRows)
	res.ModelDailyTrend = make(map[string][]DailyCount)
	for _, r := range modelTrendRows {
		res.ModelDailyTrend[r.Model] = append(res.ModelDailyTrend[r.Model], DailyCount{Date: r.Date, Count: r.Count})
	}

	return &res, nil
}

// ── Users ──────────────────────────────────────────────────────────────────

type AdminUserItem struct {
	ID           uint      `json:"id"`
	Email        string    `json:"email"`
	Nickname     string    `json:"nickname"`
	Tier         string    `json:"tier"`
	IsAdmin      bool      `json:"is_admin"`
	IsDisabled   bool      `json:"is_disabled"`
	AnalysisUsed int       `json:"analysis_used"`
	CreatedAt    time.Time `json:"created_at"`
}

type UserListResult struct {
	Items    []AdminUserItem `json:"items"`
	Total    int64           `json:"total"`
	Page     int             `json:"page"`
	PageSize int             `json:"page_size"`
}

func (s *AdminService) ListUsers(_ context.Context, page, pageSize int, q string) (*UserListResult, error) {
	db := database.DB.Model(&model.User{})
	if q != "" {
		like := "%" + q + "%"
		db = db.Where("email LIKE ? OR nickname LIKE ?", like, like)
	}

	var total int64
	db.Count(&total)

	var users []model.User
	db.Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&users)

	items := make([]AdminUserItem, 0, len(users))
	for _, u := range users {
		items = append(items, AdminUserItem{
			ID:           u.ID,
			Email:        u.Email,
			Nickname:     u.Nickname,
			Tier:         string(u.Tier),
			IsAdmin:      u.IsAdmin,
			IsDisabled:   u.IsDisabled,
			AnalysisUsed: u.AnalysisUsed,
			CreatedAt:    u.CreatedAt,
		})
	}
	return &UserListResult{Items: items, Total: total, Page: page, PageSize: pageSize}, nil
}

type CreateUserRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Nickname string `json:"nickname"`
	Tier     string `json:"tier"`
	IsAdmin  bool   `json:"is_admin"`
}

func (s *AdminService) CreateUser(_ context.Context, req CreateUserRequest) (*AdminUserItem, error) {
	var existing model.User
	if err := database.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		return nil, errors.New("邮箱已被注册")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	tier := model.TierFree
	if req.Tier == string(model.TierPro) {
		tier = model.TierPro
	}
	user := &model.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		Nickname:     req.Nickname,
		Tier:         tier,
		IsAdmin:      req.IsAdmin,
	}
	if err := database.DB.Create(user).Error; err != nil {
		return nil, err
	}
	item := &AdminUserItem{
		ID:        user.ID,
		Email:     user.Email,
		Nickname:  user.Nickname,
		Tier:      string(user.Tier),
		IsAdmin:   user.IsAdmin,
		CreatedAt: user.CreatedAt,
	}
	return item, nil
}

type UpdateUserRequest struct {
	Nickname   string `json:"nickname"`
	Tier       string `json:"tier"`
	IsAdmin    bool   `json:"is_admin"`
	IsDisabled bool   `json:"is_disabled"`
	Password   string `json:"password"` // 可选，非空则重置密码
}

func (s *AdminService) UpdateUser(_ context.Context, id uint, req UpdateUserRequest) (*AdminUserItem, error) {
	var user model.User
	if err := database.DB.First(&user, id).Error; err != nil {
		return nil, errors.New("用户不存在")
	}
	updates := map[string]any{
		"nickname":    req.Nickname,
		"is_admin":    req.IsAdmin,
		"is_disabled": req.IsDisabled,
	}
	if req.Tier == string(model.TierPro) {
		updates["tier"] = model.TierPro
	} else {
		updates["tier"] = model.TierFree
	}
	if req.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		updates["password_hash"] = string(hash)
	}
	if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
		return nil, err
	}
	return &AdminUserItem{
		ID:           user.ID,
		Email:        user.Email,
		Nickname:     req.Nickname,
		Tier:         req.Tier,
		IsAdmin:      req.IsAdmin,
		IsDisabled:   req.IsDisabled,
		AnalysisUsed: user.AnalysisUsed,
		CreatedAt:    user.CreatedAt,
	}, nil
}

func (s *AdminService) DeleteUser(_ context.Context, id uint) error {
	var user model.User
	if err := database.DB.First(&user, id).Error; err != nil {
		return errors.New("用户不存在")
	}
	// 级联删除关联数据
	database.DB.Where("resume_id IN (SELECT id FROM resumes WHERE user_id = ?)", id).Delete(&model.ResumeVersion{})
	database.DB.Where("resume_id IN (SELECT id FROM resumes WHERE user_id = ?)", id).Delete(&model.Analysis{})
	database.DB.Where("user_id = ?", id).Delete(&model.Resume{})
	database.DB.Where("user_id = ?", id).Delete(&model.Subscription{})
	return database.DB.Delete(&user).Error
}

type AdminResumeItem struct {
	ID        uint      `json:"id"`
	UserID    uint      `json:"user_id"`
	UserEmail string    `json:"user_email"`
	Title     string    `json:"title"`
	FileType  string    `json:"file_type"`
	Status    string    `json:"status"`
	RawText   string    `json:"raw_text,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type ResumeListResult struct {
	Items    []AdminResumeItem `json:"items"`
	Total    int64             `json:"total"`
	Page     int               `json:"page"`
	PageSize int               `json:"page_size"`
}

func (s *AdminService) ListResumes(_ context.Context, page, pageSize int, q string) (*ResumeListResult, error) {
	db := database.DB.Table("resumes").
		Select("resumes.*, users.email as user_email").
		Joins("LEFT JOIN users ON users.id = resumes.user_id")

	if q != "" {
		like := "%" + q + "%"
		db = db.Where("resumes.title LIKE ? OR users.email LIKE ?", like, like)
	}

	var total int64
	db.Count(&total)

	type row struct {
		model.Resume
		UserEmail string
	}
	var rows []row
	db.Order("resumes.created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Scan(&rows)

	items := make([]AdminResumeItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, AdminResumeItem{
			ID:        r.Resume.ID,
			UserID:    r.Resume.UserID,
			UserEmail: r.UserEmail,
			Title:     r.Resume.Title,
			FileType:  r.Resume.FileType,
			Status:    string(r.Resume.Status),
			RawText:   r.Resume.RawText,
			CreatedAt: r.Resume.CreatedAt,
		})
	}
	return &ResumeListResult{Items: items, Total: total, Page: page, PageSize: pageSize}, nil
}

type CreateResumeRequest struct {
	UserID   uint   `json:"user_id" binding:"required"`
	Title    string `json:"title" binding:"required"`
	FileType string `json:"file_type"`
	Status   string `json:"status"`
}

func (s *AdminService) CreateResume(_ context.Context, req CreateResumeRequest) (*AdminResumeItem, error) {
	var user model.User
	if err := database.DB.First(&user, req.UserID).Error; err != nil {
		return nil, errors.New("用户不存在")
	}
	status := model.ResumeStatusReady
	switch req.Status {
	case string(model.ResumeStatusPending):
		status = model.ResumeStatusPending
	case string(model.ResumeStatusProcessing):
		status = model.ResumeStatusProcessing
	case string(model.ResumeStatusFailed):
		status = model.ResumeStatusFailed
	}
	r := &model.Resume{
		UserID:   req.UserID,
		Title:    req.Title,
		FileType: req.FileType,
		Status:   status,
	}
	if err := database.DB.Create(r).Error; err != nil {
		return nil, err
	}
	return &AdminResumeItem{
		ID:        r.ID,
		UserID:    r.UserID,
		UserEmail: user.Email,
		Title:     r.Title,
		FileType:  r.FileType,
		Status:    string(r.Status),
		CreatedAt: r.CreatedAt,
	}, nil
}

type UpdateResumeRequest struct {
	Title  string `json:"title" binding:"required"`
	Status string `json:"status"`
}

func (s *AdminService) UpdateResume(_ context.Context, id uint, req UpdateResumeRequest) (*AdminResumeItem, error) {
	type row struct {
		model.Resume
		UserEmail string
	}
	var r row
	if err := database.DB.Table("resumes").
		Select("resumes.*, users.email as user_email").
		Joins("LEFT JOIN users ON users.id = resumes.user_id").
		Where("resumes.id = ?", id).
		First(&r).Error; err != nil {
		return nil, errors.New("简历不存在")
	}
	status := r.Resume.Status
	switch req.Status {
	case string(model.ResumeStatusPending):
		status = model.ResumeStatusPending
	case string(model.ResumeStatusProcessing):
		status = model.ResumeStatusProcessing
	case string(model.ResumeStatusReady):
		status = model.ResumeStatusReady
	case string(model.ResumeStatusFailed):
		status = model.ResumeStatusFailed
	}
	if err := database.DB.Model(&r.Resume).Updates(map[string]any{
		"title":  req.Title,
		"status": status,
	}).Error; err != nil {
		return nil, err
	}
	return &AdminResumeItem{
		ID:        r.Resume.ID,
		UserID:    r.Resume.UserID,
		UserEmail: r.UserEmail,
		Title:     req.Title,
		FileType:  r.Resume.FileType,
		Status:    string(status),
		CreatedAt: r.Resume.CreatedAt,
	}, nil
}

func (s *AdminService) DeleteResume(_ context.Context, id uint) error {
	var r model.Resume
	if err := database.DB.First(&r, id).Error; err != nil {
		return errors.New("简历不存在")
	}
	database.DB.Where("resume_id = ?", id).Delete(&model.ResumeVersion{})
	database.DB.Where("resume_id = ?", id).Delete(&model.Analysis{})
	return database.DB.Delete(&r).Error
}

type AdminAnalysisItem struct {
	ID            uint      `json:"id"`
	UserID        uint      `json:"user_id"`
	UserEmail     string    `json:"user_email"`
	ResumeID      uint      `json:"resume_id"`
	ResumeTitle   string    `json:"resume_title"`
	TotalScore    int       `json:"total_score"`
	JDMatchScore  int       `json:"jd_match_score"`
	ModelUsed     string    `json:"model_used"`
	DetailScores  string    `json:"detail_scores,omitempty"`
	Issues        string    `json:"issues,omitempty"`
	Suggestions   string    `json:"suggestions,omitempty"`
	JDText        string    `json:"jd_text,omitempty"`
	JDMissingKeys string    `json:"jd_missing_keys,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type AnalysisListResult struct {
	Items    []AdminAnalysisItem `json:"items"`
	Total    int64               `json:"total"`
	Page     int                 `json:"page"`
	PageSize int                 `json:"page_size"`
}

func (s *AdminService) ListAnalyses(_ context.Context, page, pageSize int, q string) (*AnalysisListResult, error) {
	db := database.DB.Table("analyses").
		Select("analyses.*, users.email as user_email, resumes.title as resume_title").
		Joins("LEFT JOIN users ON users.id = analyses.user_id").
		Joins("LEFT JOIN resumes ON resumes.id = analyses.resume_id")

	if q != "" {
		like := "%" + q + "%"
		db = db.Where("users.email LIKE ? OR resumes.title LIKE ?", like, like)
	}

	var total int64
	db.Count(&total)

	type row struct {
		model.Analysis
		UserEmail   string
		ResumeTitle string
	}
	var rows []row
	db.Order("analyses.created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Scan(&rows)

	items := make([]AdminAnalysisItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, AdminAnalysisItem{
			ID:            r.Analysis.ID,
			UserID:        r.Analysis.UserID,
			UserEmail:     r.UserEmail,
			ResumeID:      r.Analysis.ResumeID,
			ResumeTitle:   r.ResumeTitle,
			TotalScore:    r.Analysis.TotalScore,
			JDMatchScore:  r.Analysis.JDMatchScore,
			ModelUsed:     r.Analysis.ModelUsed,
			DetailScores:  r.Analysis.DetailScores,
			Issues:        r.Analysis.Issues,
			Suggestions:   r.Analysis.Suggestions,
			JDText:        r.Analysis.JDText,
			JDMissingKeys: r.Analysis.JDMissingKeys,
			CreatedAt:     r.Analysis.CreatedAt,
		})
	}
	return &AnalysisListResult{Items: items, Total: total, Page: page, PageSize: pageSize}, nil
}

type CreateAnalysisRequest struct {
	ResumeID     uint   `json:"resume_id" binding:"required"`
	UserID       uint   `json:"user_id" binding:"required"`
	TotalScore   int    `json:"total_score"`
	JDMatchScore int    `json:"jd_match_score"`
	ModelUsed    string `json:"model_used"`
}

func (s *AdminService) CreateAnalysis(_ context.Context, req CreateAnalysisRequest) (*AdminAnalysisItem, error) {
	type row struct {
		UserEmail   string
		ResumeTitle string
	}
	var meta row
	database.DB.Table("resumes").
		Select("users.email as user_email, resumes.title as resume_title").
		Joins("LEFT JOIN users ON users.id = resumes.user_id").
		Where("resumes.id = ?", req.ResumeID).
		Scan(&meta)

	a := &model.Analysis{
		ResumeID:     req.ResumeID,
		UserID:       req.UserID,
		TotalScore:   req.TotalScore,
		JDMatchScore: req.JDMatchScore,
		ModelUsed:    req.ModelUsed,
	}
	if err := database.DB.Create(a).Error; err != nil {
		return nil, err
	}
	return &AdminAnalysisItem{
		ID:           a.ID,
		UserID:       a.UserID,
		UserEmail:    meta.UserEmail,
		ResumeID:     a.ResumeID,
		ResumeTitle:  meta.ResumeTitle,
		TotalScore:   a.TotalScore,
		JDMatchScore: a.JDMatchScore,
		ModelUsed:    a.ModelUsed,
		CreatedAt:    a.CreatedAt,
	}, nil
}

type UpdateAnalysisRequest struct {
	TotalScore   int    `json:"total_score"`
	JDMatchScore int    `json:"jd_match_score"`
	ModelUsed    string `json:"model_used"`
}

func (s *AdminService) UpdateAnalysis(_ context.Context, id uint, req UpdateAnalysisRequest) (*AdminAnalysisItem, error) {
	type row struct {
		model.Analysis
		UserEmail   string
		ResumeTitle string
	}
	var r row
	if err := database.DB.Table("analyses").
		Select("analyses.*, users.email as user_email, resumes.title as resume_title").
		Joins("LEFT JOIN users ON users.id = analyses.user_id").
		Joins("LEFT JOIN resumes ON resumes.id = analyses.resume_id").
		Where("analyses.id = ?", id).
		First(&r).Error; err != nil {
		return nil, errors.New("分析记录不存在")
	}
	if err := database.DB.Model(&r.Analysis).Updates(map[string]any{
		"total_score":    req.TotalScore,
		"jd_match_score": req.JDMatchScore,
		"model_used":     req.ModelUsed,
	}).Error; err != nil {
		return nil, err
	}
	return &AdminAnalysisItem{
		ID:           r.Analysis.ID,
		UserID:       r.Analysis.UserID,
		UserEmail:    r.UserEmail,
		ResumeID:     r.Analysis.ResumeID,
		ResumeTitle:  r.ResumeTitle,
		TotalScore:   req.TotalScore,
		JDMatchScore: req.JDMatchScore,
		ModelUsed:    req.ModelUsed,
		CreatedAt:    r.Analysis.CreatedAt,
	}, nil
}

func (s *AdminService) DeleteAnalysis(_ context.Context, id uint) error {
	var a model.Analysis
	if err := database.DB.First(&a, id).Error; err != nil {
		return errors.New("分析记录不存在")
	}
	return database.DB.Delete(&a).Error
}

// ── System Prompt ──────────────────────────────────────────────────────────

type PromptRecord struct {
	Content   string    `json:"content"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *AdminService) GetPrompt(_ context.Context) (*PromptRecord, error) {
	var p model.SystemPrompt
	if err := database.DB.First(&p, 1).Error; err != nil {
		// Not yet set — return the hardcoded default so the UI can display it
		return &PromptRecord{Content: ai.DefaultAnalysisPromptTemplate}, nil
	}
	return &PromptRecord{Content: p.Content, UpdatedAt: p.UpdatedAt}, nil
}

func (s *AdminService) UpdatePrompt(_ context.Context, content string) (*PromptRecord, error) {
	p := model.SystemPrompt{ID: 1, Name: "analysis", Content: content}
	if err := database.DB.Save(&p).Error; err != nil {
		return nil, err
	}
	return &PromptRecord{Content: p.Content, UpdatedAt: p.UpdatedAt}, nil
}

func (s *AdminService) GetGenerationPrompt(_ context.Context) (*PromptRecord, error) {
	var p model.SystemPrompt
	if err := database.DB.Where("id = 2").First(&p).Error; err != nil {
		return &PromptRecord{Content: ai.DefaultGenerationPromptTemplate}, nil
	}
	return &PromptRecord{Content: p.Content, UpdatedAt: p.UpdatedAt}, nil
}

func (s *AdminService) UpdateGenerationPrompt(_ context.Context, content string) (*PromptRecord, error) {
	p := model.SystemPrompt{ID: 2, Name: "generate", Content: content}
	if err := database.DB.Save(&p).Error; err != nil {
		return nil, err
	}
	return &PromptRecord{Content: p.Content, UpdatedAt: p.UpdatedAt}, nil
}
